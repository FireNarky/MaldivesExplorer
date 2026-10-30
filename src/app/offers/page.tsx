import type { Metadata } from "next";
import { PageHeader } from "@/components/patterns/page-header";
import { OfferCard } from "@/components/patterns/offer-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { listPublicOffers } from "@/modules/offers/service";

export const metadata: Metadata = publicMetadata({
  title: "Exclusive Maldives Travel Offers",
  description:
    "Curated island packages with complimentary seaplane transfers, half board upgrades, and resort credits.",
  path: "/offers",
});

export default async function OffersPage() {
  try {
    const offers = await listPublicOffers();
    return (
      <div className="grid gap-10">
        <PageHeader
          crumbs={[{ name: "Home", href: "/" }, { name: "Offers" }]}
          title="Curated Travel Offers"
          lede="Exclusive privileges negotiated directly with Maldives resort partners, including complimentary seaplane flights, spa treatments, and private dining."
        />

        {offers.length === 0 ? (
          <EmptyState title="Offers">
            <p>No current promotional offers are published at this time.</p>
          </EmptyState>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                item={{
                  id: offer.id,
                  title: offer.title,
                  slug: offer.slug,
                  summary: offer.summary,
                  resortName: offer.resortName,
                  resortSlug: offer.resortHref.replace("/resorts/", ""),
                  transferIncluded: offer.transferIncluded,
                  minNights: offer.minNights,
                  validUntil: offer.validUntil,
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "Published offers could not be loaded.");
    return (
      <ErrorState title="Offers">
        <p>Published offers could not be loaded.</p>
      </ErrorState>
    );
  }
}
