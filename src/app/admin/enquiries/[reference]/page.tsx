import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { EnquiryWorkspace } from "@/components/crm/enquiry-workspace";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { CrmError, readEnquiry } from "@/modules/crm/service";
import { PARTY_NOT_SUPPLIED_LABEL } from "@/modules/enquiries/party";
import { createQuoteForm } from "@/modules/quotes/actions";
import { QuoteError, listEnquiryQuotes } from "@/modules/quotes/service";

type Context = {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const { reference } = await params;
  return { title: reference };
}

export default async function EnquiryDetailPage({ params, searchParams }: Context) {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) notFound();
  const { reference } = await params;
  const query = await searchParams;
  let detail;
  try {
    detail = await readEnquiry(session.user.id, reference);
  } catch (error) {
    if (error instanceof CrmError && (error.status === 403 || error.status === 404)) notFound();
    throw error;
  }
  let quotes: Awaited<ReturnType<typeof listEnquiryQuotes>> | null = null;
  try {
    quotes = await listEnquiryQuotes(session.user.id, reference);
  } catch (error) {
    if (!(error instanceof QuoteError)) throw error;
  }
  return (
    <article className="grid gap-6">
      <p>
        <Link href="/admin/enquiries" className="font-semibold text-lagoon-ink">
          Enquiry queue
        </Link>
      </p>
      <h1>{detail.reference}</h1>
      {query.error ? <FieldError>{query.error}</FieldError> : null}
      {query.notice ? <p>Saved.</p> : null}
      <dl className="grid max-w-[65ch] gap-3">
        <div>
          <dt className="font-semibold">Customer</dt>
          <dd>
            {detail.customerName} · {detail.customerEmail}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Received</dt>
          <dd>{detail.createdLabel}</dd>
        </div>
        <div>
          <dt className="font-semibold">Travel</dt>
          <dd>{detail.travel}</dd>
        </div>
        {detail.flexibility ? (
          <div>
            <dt className="font-semibold">Flexibility</dt>
            <dd>{detail.flexibility}</dd>
          </div>
        ) : null}
        <div>
          <dt className="font-semibold">Party</dt>
          <dd>
            {detail.partySupplied
              ? `${detail.adultCount} adults, ${detail.childCount} children`
              : PARTY_NOT_SUPPLIED_LABEL}
          </dd>
        </div>
        {detail.travelers.length > 0 ? (
          <div>
            <dt className="font-semibold">Travelers</dt>
            <dd>{detail.travelers.join(", ")}</dd>
          </div>
        ) : null}
        {detail.budget ? (
          <div>
            <dt className="font-semibold">Budget</dt>
            <dd>{detail.budget}</dd>
          </div>
        ) : null}
        <div>
          <dt className="font-semibold">Requirements</dt>
          <dd>{detail.requirements ?? "Not added"}</dd>
        </div>
        <div>
          <dt className="font-semibold">Accessibility</dt>
          <dd>{detail.accessibilityNeeds ?? "Not added"}</dd>
        </div>
        <div>
          <dt className="font-semibold">First response</dt>
          <dd>
            {detail.targetMinutes
              ? `Internal target ${detail.targetMinutes} business minutes. ${detail.slaLabel}.`
              : detail.slaLabel}
            {detail.firstResponseLabel ? ` Recorded ${detail.firstResponseLabel}.` : ""}
          </dd>
        </div>
      </dl>
      {quotes ? (
        <section className="grid gap-3">
          <h2>Quotes</h2>
          {quotes.quotes.length === 0 ? <p>No quote has been prepared.</p> : null}
          <ul className="grid gap-2">
            {quotes.quotes.map((quote) => (
              <li key={quote.id}>
                <Link href={`/admin/quotes/${quote.id}`} className="font-semibold text-lagoon-ink">
                  {quote.reference}
                </Link>
                <p className="text-sm text-muted">
                  Version {quote.versionNo} · {quote.statusLabel}
                </p>
              </li>
            ))}
          </ul>
          {quotes.canCreate ? (
            <form action={createQuoteForm}>
              <input type="hidden" name="reference" value={detail.reference} />
              <Button type="submit">Prepare a quote</Button>
            </form>
          ) : null}
        </section>
      ) : null}
      <EnquiryWorkspace detail={detail} />
    </article>
  );
}
