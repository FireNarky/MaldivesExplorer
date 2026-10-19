import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label";
import { permissionsForUser } from "@/modules/identity/service";
import { uploadMediaRecord } from "@/modules/admin/actions";
import { listMedia } from "@/modules/media";

export default async function MediaListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) redirect("/login");
  const permissions = await permissionsForUser(session.user.id);
  if (!permissions.includes("media.read") && !permissions.includes("media.write"))
    redirect("/admin");
  const rows = await listMedia();
  return (
    <section className="grid max-w-[65ch] gap-6">
      <h1>Media</h1>
      {permissions.includes("media.write") ? (
        <form action={uploadMediaRecord} className="grid gap-4">
          {query.error ? <FieldError>{query.error}</FieldError> : null}
          <div className="grid gap-2">
            <Label htmlFor="file">File</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              required
              className="text-base"
            />
          </div>
          <Button type="submit">Upload</Button>
        </form>
      ) : null}
      {rows.length === 0 ? <p>No files yet.</p> : null}
      <ul className="grid gap-2">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/admin/media/${row.id}`} className="text-lagoon-ink">
              {row.kind} · {row.mimeType}
            </Link>
            <span> · {row.status}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
