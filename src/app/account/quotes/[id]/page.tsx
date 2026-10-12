import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label";
import { noteConsentEvent } from "@/modules/analytics/service";
import { readOwnQuote } from "@/modules/customers/records";
import { respondToQuoteForm } from "@/modules/quotes/actions";

type Context = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const { id } = await params;
  const session = await auth().catch(() => null);
  const quote = await readOwnQuote(session?.user?.id || "", id);
  return {
    title: quote?.reference ?? "Quote",
    robots: { index: false, follow: false },
  };
}

export default async function QuotePage({ params, searchParams }: Context) {
  const session = await auth().catch(() => null);
  const { id } = await params;
  const query = await searchParams;
  const quote = await readOwnQuote(session?.user?.id || "", id);
  if (!quote) notFound();
  await noteConsentEvent("quote_viewed", { kind: "quote" });
  const acceptKey = randomUUID();
  const declineKey = randomUUID();
  const clarifyKey = randomUUID();
  return (
    <article className="grid max-w-[65ch] gap-6">
      <p className="text-sm text-muted">{quote.statusLabel}</p>
      <h1>{quote.welcome}</h1>
      {quote.overview ? <p className="text-lg">{quote.overview}</p> : null}
      <section className="grid gap-3">
        <h2>Accommodation</h2>
        {quote.segments.length === 0 ? <p>No stay is listed.</p> : null}
        <ul className="grid gap-3">
          {quote.segments.map((segment) => (
            <li key={`${segment.dates}-${segment.resort}`} className="grid gap-1">
              <p>{segment.dates}</p>
              <p>{segment.resort}</p>
              {segment.room ? <p>{segment.room}</p> : null}
              {segment.meal ? <p>{segment.meal}</p> : null}
              {segment.notes ? <p>{segment.notes}</p> : null}
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-2">
        <h2>Transfers</h2>
        {quote.transfers.length === 0 ? <p>No transfer is listed.</p> : null}
        <ul className="grid gap-2">
          {quote.transfers.map((transfer) => (
            <li key={transfer}>{transfer}</li>
          ))}
        </ul>
      </section>
      <section className="grid gap-2">
        <h2>Activities</h2>
        {quote.activities.length === 0 ? <p>No activity is listed.</p> : null}
        <ul className="grid gap-2">
          {quote.activities.map((activity) => (
            <li key={activity}>{activity}</li>
          ))}
        </ul>
      </section>
      <section className="grid gap-3">
        <h2>Pricing</h2>
        <p className="text-sm text-muted">{quote.currency}</p>
        <ul className="grid gap-2">
          {quote.lines.map((line) => (
            <li
              key={`${line.description}-${line.amount}`}
              className="flex flex-wrap justify-between gap-2"
            >
              <span>{line.description}</span>
              <span>{line.amount}</span>
            </li>
          ))}
        </ul>
        <dl className="grid gap-2">
          <div className="flex justify-between gap-4">
            <dt>Subtotal</dt>
            <dd>{quote.subtotal}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Tax</dt>
            <dd>{quote.taxTotal}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Fees</dt>
            <dd>{quote.feeTotal}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Discounts</dt>
            <dd>{quote.discountTotal}</dd>
          </div>
          <div className="flex justify-between gap-4 font-semibold">
            <dt>Total</dt>
            <dd>{quote.grandTotal}</dd>
          </div>
        </dl>
      </section>
      <section className="grid gap-2">
        <h2>Terms</h2>
        <p>{quote.terms}</p>
        <p>Valid through {quote.expiresOn}.</p>
      </section>
      <section className="grid gap-4">
        <h2>Next steps</h2>
        {query.error ? <FieldError>{query.error}</FieldError> : null}
        {query.notice ? <p>Recorded.</p> : null}
        {quote.canAccept ? (
          <p>
            Accept or decline this version before it expires. Acceptance records your choice. A
            consultant confirms any reservation with the resort.
          </p>
        ) : null}
        {quote.statusLabel === "Accepted" ? <p>You accepted this version.</p> : null}
        {quote.statusLabel === "Declined" ? <p>You declined this version.</p> : null}
        {quote.statusLabel === "Expired" || (!quote.canAccept && quote.canClarify) ? (
          <p>This quote has expired.</p>
        ) : null}
        {quote.statusLabel === "Superseded" ? <p>A later version replaced this one.</p> : null}
        {quote.statusLabel === "Withdrawn" ? <p>This version was withdrawn.</p> : null}
        {quote.pdfAvailable ? (
          <Link
            href={`/api/v1/me/quotes/${quote.id}/pdf`}
            className="inline-flex min-h-11 items-center font-semibold text-lagoon-ink"
          >
            Download PDF
          </Link>
        ) : null}
        {quote.canAccept ? (
          <form action={respondToQuoteForm} className="grid gap-3">
            <input type="hidden" name="versionId" value={quote.id} />
            <input type="hidden" name="responseType" value="ACCEPT" />
            <input type="hidden" name="idempotencyKey" value={acceptKey} />
            <div className="grid gap-2">
              <Label htmlFor="accept-message">Note with your acceptance</Label>
              <textarea
                id="accept-message"
                name="message"
                maxLength={2000}
                className="min-h-24 w-full rounded-sm border border-border bg-white px-4 py-3 text-base text-ink"
              />
            </div>
            <Button type="submit">Accept quote</Button>
          </form>
        ) : null}
        {quote.canAccept ? (
          <form action={respondToQuoteForm} className="grid gap-3">
            <input type="hidden" name="versionId" value={quote.id} />
            <input type="hidden" name="responseType" value="DECLINE" />
            <input type="hidden" name="idempotencyKey" value={declineKey} />
            <div className="grid gap-2">
              <Label htmlFor="decline-message">Note with your decline</Label>
              <textarea
                id="decline-message"
                name="message"
                maxLength={2000}
                className="min-h-24 w-full rounded-sm border border-border bg-white px-4 py-3 text-base text-ink"
              />
            </div>
            <Button type="submit" variant="secondary">
              Decline quote
            </Button>
          </form>
        ) : null}
        {quote.canClarify ? (
          <form action={respondToQuoteForm} className="grid gap-3">
            <input type="hidden" name="versionId" value={quote.id} />
            <input type="hidden" name="responseType" value="CLARIFICATION" />
            <input type="hidden" name="idempotencyKey" value={clarifyKey} />
            <div className="grid gap-2">
              <Label htmlFor="clarify-message">Question for the consultant</Label>
              <textarea
                id="clarify-message"
                name="message"
                maxLength={2000}
                required
                className="min-h-24 w-full rounded-sm border border-border bg-white px-4 py-3 text-base text-ink"
              />
            </div>
            <Button type="submit" variant="secondary">
              Ask a question
            </Button>
          </form>
        ) : null}
        <Link
          href={`/account/enquiries/${quote.enquiryReference}`}
          className="inline-flex min-h-11 items-center font-semibold text-lagoon-ink"
        >
          Back to {quote.enquiryReference}
        </Link>
      </section>
      {quote.responses.length > 0 ? (
        <section className="grid gap-2">
          <h2>Responses</h2>
          <ul className="grid gap-2">
            {quote.responses.map((response) => (
              <li key={`${response.label}-${response.createdAt}`}>
                <p className="font-semibold">{response.label}</p>
                {response.message ? <p>{response.message}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
