import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { QuoteError, listQuotes } from "@/modules/quotes/service";

export const metadata: Metadata = { title: "Quotes" };

export default async function QuotesPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) notFound();
  let rows;
  try {
    rows = await listQuotes(session.user.id);
  } catch (error) {
    if (error instanceof QuoteError && (error.status === 403 || error.status === 404)) notFound();
    throw error;
  }
  return (
    <article className="grid gap-6">
      <h1>Quotes</h1>
      {rows.length === 0 ? (
        <EmptyState title="No quotes yet">
          Open an assigned enquiry and prepare a quote from there.
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/quotes/${row.id}`} className="font-semibold text-lagoon-ink">
                {row.reference}
              </Link>
              <p className="text-sm text-muted">
                {row.enquiryReference} · Version {row.versionNo} · {row.statusLabel} ·{" "}
                {row.grandTotal}
              </p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
