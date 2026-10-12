import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label";
import { permissionsForUser } from "@/modules/identity/service";
import { importNewsletterForm, suppressNewsletterForm } from "@/modules/newsletter/actions";
import { NewsletterError, listSubscriptions } from "@/modules/newsletter/service";

export default async function NewsletterAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) notFound();
  const query = await searchParams;
  const permissions = await permissionsForUser(session.user.id);
  const canWrite = permissions.includes("newsletter.write");
  let rows;
  try {
    rows = await listSubscriptions(session.user.id);
  } catch (error) {
    if (error instanceof NewsletterError && error.status === 404) notFound();
    throw error;
  }
  return (
    <section className="grid max-w-[65ch] gap-8">
      <h1>Newsletter</h1>
      {query.error ? <FieldError>{query.error}</FieldError> : null}
      {query.notice ? <p role="status">Saved.</p> : null}
      {canWrite ? (
        <p>
          <Link href="/api/v1/admin/newsletter/export" className="font-semibold text-lagoon-ink">
            Export
          </Link>
        </p>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState title="No subscribers yet">
          <p>A subscription appears here after consent is stored.</p>
        </EmptyState>
      ) : (
        <ul className="grid gap-4">
          {rows.map((row) => (
            <li key={row.id} className="grid gap-1">
              <p className="font-semibold">{row.email}</p>
              <p>{row.statusLabel}</p>
              <p>{row.topics || "No optional topics"}</p>
              <p>{row.consentGranted ? "Consent granted" : "Consent withdrawn"}</p>
              {canWrite && row.statusLabel !== "Suppressed" ? (
                <form action={suppressNewsletterForm}>
                  <input type="hidden" name="id" value={row.id} />
                  <Button type="submit" variant="secondary">
                    Suppress
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canWrite ? (
        <form action={importNewsletterForm} className="grid gap-4">
          <h2>Import</h2>
          <div className="grid gap-2">
            <Label htmlFor="emails">Email addresses</Label>
            <textarea
              id="emails"
              name="emails"
              required
              className="min-h-32 w-full rounded-sm border border-border bg-white px-4 py-3 text-base text-ink"
            />
          </div>
          <label className="flex min-h-11 items-start gap-3">
            <input type="checkbox" name="attestation" value="yes" required />
            <span>I attest that each address has newsletter consent.</span>
          </label>
          <Button type="submit">Import</Button>
        </form>
      ) : null}
    </section>
  );
}
