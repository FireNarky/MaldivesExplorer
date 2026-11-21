import type { Metadata } from "next";
import Link from "next/link";
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

        {/* Bespoke Privileges & Direct Resort Negotiation Card */}
        <section className="relative overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-[#083b4c]/95 via-[#083b4c] to-[#062936] dark:from-[#061d28] dark:via-[#082633] dark:to-[#041219] p-6 sm:p-10 text-white shadow-2">
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#2bbcd0_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md border border-white/20">
                ✨ Direct Resort Privileges
              </span>
              <h2 className="text-xl sm:text-2xl font-display font-medium text-white">
                Seeking a bespoke multi-island itinerary or private island buyout?
              </h2>
              <p className="text-sm text-slate-200 font-light leading-relaxed">
                Our editorial travel team liaises directly with resort general managers to secure unpublished privileges, complimentary villa upgrades, and custom seaplane schedules.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/plan"
                className="inline-flex items-center gap-2 rounded-full bg-[#7ccdc6] px-5 py-2.5 text-xs font-bold text-[#071318] shadow-md hover:bg-[#9adbd5] transition-all hover:scale-105 active:scale-95"
              >
                Plan Custom Itinerary &rarr;
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-all active:scale-95"
              >
                Speak with Concierge
              </Link>
            </div>
          </div>
        </section>
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
