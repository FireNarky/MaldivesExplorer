import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { EditorForm } from "@/components/admin/editor-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { permissionsForUser } from "@/modules/identity/service";
import { saveMediaRecord, transitionMediaRecord } from "@/modules/admin/actions";
import { allowedStatuses, mediaFields } from "@/modules/admin/screen";

export default async function MediaEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) redirect("/login");
  const permissions = await permissionsForUser(session.user.id);
  if (!permissions.includes("media.read") && !permissions.includes("media.write")) notFound();
  const editor = await mediaFields(id);
  if (editor.fields.length === 0) notFound();
  const canWrite = permissions.includes("media.write");
  const statuses = editor.status
    ? await allowedStatuses(session.user.id, editor.status, "media")
    : [];
  return (
    <section className="grid gap-8">
      <h1>Media</h1>
      {editor.status ? <p>Status: {editor.status}</p> : null}
      {canWrite ? (
        <EditorForm
          action={saveMediaRecord.bind(null, id)}
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
        <form action={transitionMediaRecord.bind(null, id)} className="grid max-w-[65ch] gap-4">
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
          <Button type="submit" variant="secondary">
            Update status
          </Button>
        </form>
      ) : null}
    </section>
  );
}
