import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { readOwnEnquiry } from "@/modules/customers/records";

type Context = { params: Promise<{ reference: string }> };

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const { reference } = await params;
  return {
    title: reference,
    robots: { index: false, follow: false },
  };
}

export default async function EnquiryPage({ params }: Context) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id || "";
  const { reference } = await params;
  const enquiry = await readOwnEnquiry(userId, reference);
  if (!enquiry) notFound();
  return (
    <article className="grid max-w-[65ch] gap-6">
      <h1>{enquiry.reference}</h1>
      <p>{enquiry.statusLabel}</p>
      <dl className="grid gap-3">
        <div>
          <dt className="font-semibold">Dates</dt>
          <dd>
            {enquiry.travelStart && enquiry.travelEnd
              ? `${enquiry.travelStart} to ${enquiry.travelEnd}`
              : "Not added"}
          </dd>
        </div>
        {enquiry.flexibility ? (
          <div>
            <dt className="font-semibold">Flexibility</dt>
            <dd>{enquiry.flexibility}</dd>
          </div>
        ) : null}
        <div>
          <dt className="font-semibold">Adults</dt>
          <dd>{enquiry.partySupplied ? enquiry.adultCount : "Not added"}</dd>
        </div>
        {enquiry.childAges.length > 0 ? (
          <div>
            <dt className="font-semibold">Child ages</dt>
            <dd>{enquiry.childAges.join(", ")}</dd>
          </div>
        ) : null}
        <div>
          <dt className="font-semibold">Budget</dt>
          <dd>{enquiry.budget ?? "Not added"}</dd>
        </div>
        <div>
          <dt className="font-semibold">Trip type</dt>
          <dd>{enquiry.tripType ?? "Not added"}</dd>
        </div>
      </dl>
      {enquiry.requirements ? <p>{enquiry.requirements}</p> : null}
      {enquiry.accessibilityNeeds ? (
        <p>
          <span className="font-semibold">Accessibility needs. </span>
          {enquiry.accessibilityNeeds}
        </p>
      ) : null}
      <section className="grid gap-2">
        <h2>Places</h2>
        <ul className="grid gap-2">
          {enquiry.resorts.map((place, index) => (
            <li key={`resort-${index}`}>
              {place.href ? (
                <Link href={place.href} className="font-semibold text-lagoon-ink">
                  {place.name}
                </Link>
              ) : (
                place.name
              )}
            </li>
          ))}
          {enquiry.offers.map((place, index) => (
            <li key={`offer-${index}`}>{place.name}</li>
          ))}
          {enquiry.interests.map((place, index) => (
            <li key={`interest-${index}`}>
              {place.href ? (
                <Link href={place.href} className="font-semibold text-lagoon-ink">
                  {place.name}
                </Link>
              ) : (
                place.name
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-2">
        <h2>Quotes</h2>
        {enquiry.quotes.length === 0 ? <p>No sent quote is on this plan.</p> : null}
        <ul className="grid gap-2">
          {enquiry.quotes.map((quote) => (
            <li key={quote.id}>
              <Link href={`/account/quotes/${quote.id}`} className="font-semibold text-lagoon-ink">
                {quote.reference} version {quote.versionNo}
              </Link>
              <span> {quote.statusLabel}</span>
            </li>
          ))}
        </ul>
      </section>
      <Link
        href={`/account/messages/${enquiry.reference}`}
        className="font-semibold text-lagoon-ink"
      >
        Messages
      </Link>
    </article>
  );
}
