import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { JsonLd } from "@/components/discovery/json-ld";
import { ListingActions } from "@/components/shortlist/listing-actions";
import { ErrorState } from "@/components/ui/error-state";
import { isNotFoundError } from "@/lib/http/navigation";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/seo/site";
import { notePublicView } from "@/modules/analytics/service";
import { readPublicOffer, type PublicOffer } from "@/modules/offers/service";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const page = await readPublicOffer(slug);
    if (page.state === "available") {
      return publicMetadata({
        title: page.offer.seoTitle ?? page.offer.title,
        description: page.offer.seoDescription ?? page.offer.summary,
        path: `/offers/${page.offer.slug}`,
      });
    }
    if (page.state === "expired") {
      return publicMetadata({
        title: page.title,
        description: "This offer is no longer available.",
        path: `/offers/${slug}`,
      });
    }
  } catch (error) {
    logError(error instanceof Error ? error.message : "Offer metadata could not be loaded.");
  }
  return publicMetadata({ title: "Offer", description: "Offer", path: `/offers/${slug}` });
}

function OfferFacts({ offer }: { offer: PublicOffer }) {
  return (
    <>
      <p>{offer.summary}</p>
      <p>
        Resort:{" "}
        <Link href={offer.resortHref} className="text-lagoon-ink">
          {offer.resortName}
        </Link>
      </p>
      {offer.roomName ? <p>Room: {offer.roomName}</p> : null}
      <p>Occupancy basis: {offer.occupancy}</p>
      <p>Meal plan: {offer.mealPlan}</p>
      <p>{offer.transferIncluded ? "Transfer is included." : "Transfer is not included."}</p>
      <p>
        Currency: {offer.currency}. An indicative price is not published.
        {offer.priceBasis ? ` Price basis: ${offer.priceBasis}.` : ""}
      </p>
      <p>
        Valid {offer.validFrom} to {offer.validUntil}.
      </p>
      {offer.stayFrom && offer.stayUntil ? (
        <p>
          Stay dates {offer.stayFrom} to {offer.stayUntil}.
        </p>
      ) : null}
      {offer.minNights ? <p>Minimum stay: {offer.minNights} nights.</p> : null}
      {offer.inclusions.length > 0 ? (
        <section className="grid gap-2">
          <h2>Inclusions</h2>
          <ul className="grid gap-1">
            {offer.inclusions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {offer.exclusions.length > 0 ? (
        <section className="grid gap-2">
          <h2>Exclusions</h2>
          <ul className="grid gap-1">
            {offer.exclusions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="grid gap-2">
        <h2>Terms</h2>
        <p>{offer.terms}</p>
      </section>
    </>
  );
}

export default async function OfferPage({ params }: PageProps) {
  const { slug } = await params;
  try {
    const page = await readPublicOffer(slug);
    if (page.state === "absent") notFound();
    if (page.state === "expired") {
      return (
        <article className="grid max-w-[65ch] gap-6">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Offers", href: "/offers" },
              { name: page.title },
            ]}
          />
          <h1>{page.title}</h1>
          <p>This offer is no longer available.</p>
        </article>
      );
    }
    const offer = page.offer;
    await notePublicView("offer", `/offers/${offer.slug}`);
    return (
      <article className="grid max-w-[65ch] gap-6">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Offers", href: "/offers" },
            { name: offer.title },
          ]}
        />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Offer",
            name: offer.title,
            description: offer.summary,
            url: absoluteUrl(`/offers/${offer.slug}`),
          }}
        />
        <h1>{offer.title}</h1>
        <ListingActions entityType="OFFER" entityId={offer.id} save />
        <OfferFacts offer={offer} />
      </article>
    );
  } catch (error) {
    if (isNotFoundError(error)) throw error;
    logError(error instanceof Error ? error.message : "This offer could not be loaded.");
    return (
      <ErrorState title="Offer">
        <p>This offer could not be loaded.</p>
      </ErrorState>
    );
  }
}
