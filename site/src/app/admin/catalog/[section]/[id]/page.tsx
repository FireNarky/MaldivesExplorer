import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { EditorForm } from "@/components/admin/editor-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { permissionsForUser } from "@/modules/identity/service";
import { saveCatalogRecord, transitionCatalogRecord } from "@/modules/admin/actions";
import {
  allowedStatuses,
  catalogFields,
  catalogSectionSingular,
  catalogSectionTitles,
  knownCatalogSection,
} from "@/modules/admin/screen";

export default async function CatalogEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string; id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { section, id } = await params;
  const query = await searchParams;
  if (!knownCatalogSection(section)) notFound();
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) redirect("/login");
  const permissions = await permissionsForUser(session.user.id);
  if (!permissions.includes("catalog.read") && !permissions.includes("catalog.write")) notFound();
  const editor = await catalogFields(section, id);
  if (id !== "new" && editor.fields.length === 0) notFound();
  const title = catalogSectionTitles[section] ?? "Catalog";
  const canWrite = permissions.includes("catalog.write");
  const statuses = editor.status
    ? await allowedStatuses(session.user.id, editor.status, "catalog")
    : [];
  return (
    <section className="grid gap-8">
      <h1>{id === "new" ? `New ${catalogSectionSingular[section]}` : title}</h1>
      {editor.status ? <p>Status: {editor.status}</p> : null}
      {canWrite ? (
        <EditorForm
          action={saveCatalogRecord.bind(null, section, id)}
          error={query.error}
          fields={editor.fields}
          submitLabel="Save"
        />
      ) : (
        <dl className="grid max-w-[65ch] gap-3">
          {editor.fields.map((field) => (
            <div key={field.name}>
              <dt className="font-semibold">{field.label}</dt>
              <dd>{field.value || "—"}</dd>
            </div>
          ))}
        </dl>
      )}
      {statuses.length > 0 ? (
        <form
          action={transitionCatalogRecord.bind(null, section, id)}
          className="grid max-w-[65ch] gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="status">Next status</Label>
            <select
              id="status"
              name="status"
              className="min-h-11 rounded-sm border border-border bg-white px-4 text-base"
              required
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="scheduledAt">Schedule time</Label>
            <input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              className="min-h-11 rounded-sm border border-border bg-white px-4 text-base"
            />
          </div>
          <Button type="submit" variant="secondary">
            Update status
          </Button>
        </form>
      ) : null}
    </section>
  );
}
