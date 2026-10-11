import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { publicMetadata } from "@/lib/seo/metadata";
import { permissionsForUser } from "@/modules/identity/service";
import { deactivateRedirectAction, saveRedirectAction } from "@/modules/redirects/actions";
import { listRedirects } from "@/modules/redirects/service";

export const metadata: Metadata = publicMetadata({
  title: "Redirects",
  description: "Managed redirects.",
  path: "/admin/redirects",
});

type PageProps = { searchParams: Promise<{ error?: string }> };

export default async function RedirectsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) redirect("/login");
  const permissions = await permissionsForUser(session.user.id);
  const canRead = permissions.includes("content.read") || permissions.includes("content.write");
  if (!canRead) redirect("/admin");
  const canWrite = permissions.includes("content.write");
  const params = await searchParams;
  let redirects: Awaited<ReturnType<typeof listRedirects>> = [];
  try {
    redirects = await listRedirects();
  } catch {
    redirects = [];
  }
  return (
    <section className="grid max-w-[65ch] gap-6">
      <h1>Redirects</h1>
      {params.error ? <p role="alert">{params.error}</p> : null}
      {canWrite ? (
        <form action={saveRedirectAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="fromPath">From path</Label>
            <Input id="fromPath" name="fromPath" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="toPath">To path</Label>
            <Input id="toPath" name="toPath" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="statusCode">Status</Label>
            <select
              id="statusCode"
              name="statusCode"
              className="min-h-11 rounded-sm border border-border bg-white px-4 text-base"
              defaultValue="301"
            >
              <option value="301">301</option>
              <option value="302">302</option>
              <option value="307">307</option>
              <option value="308">308</option>
            </select>
          </div>
          <Button type="submit">Save redirect</Button>
        </form>
      ) : null}
      {redirects.length === 0 ? (
        <p>No redirect is stored.</p>
      ) : (
        <ul className="grid gap-4">
          {redirects.map((item) => (
            <li key={item.id} className="grid gap-2">
              <p>
                {item.fromPath} to {item.toPath} ({item.statusCode}
                {item.active ? "" : ", inactive"})
              </p>
              {canWrite && item.active ? (
                <form action={deactivateRedirectAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <Button type="submit" variant="secondary">
                    Deactivate
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
