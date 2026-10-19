import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { EditorForm } from "@/components/admin/editor-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { permissionsForUser } from "@/modules/identity/service";
import { saveContentRecord, transitionContentRecord } from "@/modules/admin/actions";
import {
  allowedStatuses,
  contentFields,
  contentSectionSingular,
  contentSectionTitles,
  knownContentSection,
} from "@/modules/admin/screen";

export default async function ContentEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string; id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { section, id } = await params;
  const query = await searchParams;
  if (!knownContentSection(section)) notFound();
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) redirect("/login");
  const permissions = await permissionsForUser(session.user.id);
  if (!permissions.includes("content.read") && !permissions.includes("content.write")) notFound();
  const editor = await contentFields(section, id);
  if (id !== "new" && editor.fields.length === 0) notFound();
  const title = contentSectionTitles[section] ?? "Content";
  const canWrite = permissions.includes("content.write");
  const statuses = editor.status
    ? await allowedStatuses(session.user.id, editor.status, "content")
    : [];
  return (
    <section className="grid gap-8">
      <h1>{id === "new" ? `New ${contentSectionSingular[section]}` : title}</h1>
      {editor.status ? <p>Status: {editor.status}</p> : null}
      {canWrite ? (
        <EditorForm
          action={saveContentRecord.bind(null, section, id)}
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
          action={transitionContentRecord.bind(null, section, id)}
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
