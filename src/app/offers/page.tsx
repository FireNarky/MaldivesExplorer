import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { ErrorState } from "@/components/ui/error-state";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { listPublicOffers } from "@/modules/offers/service";

export const metadata: Metadata = publicMetadata({
  title: "Offers",
  description: "Published offers that are still within their validity dates.",
  path: "/offers",
});

export default async function OffersPage() {
  try {
    const offers = await listPublicOffers();
    if (offers.length === 0) {
      return (
        <section className="grid gap-6">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Offers" }]} />
          <h1>Offers</h1>
          <p>No current offer is published.</p>
        </section>
      );
    }
    return (
      <section className="grid gap-6">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Offers" }]} />
        <h1>Offers</h1>
        <ul className="grid gap-4">
          {offers.map((offer) => (
            <li key={offer.id} className="grid max-w-[65ch] gap-2">
              <h2>
                <Link href={`/offers/${offer.slug}`} className="text-lagoon-ink">
                  {offer.title}
                </Link>
              </h2>
              <p>{offer.summary}</p>
              <p>
                <Link href={offer.resortHref} className="text-lagoon-ink">
                  {offer.resortName}
                </Link>
                {" · "}
                Valid {offer.validFrom} to {offer.validUntil}
              </p>
              <p>An indicative price is not published.</p>
            </li>
          ))}
        </ul>
      </section>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "Published offers could not be loaded.");
    return (
      <section className="grid gap-6">
        <h1>Offers</h1>
        <ErrorState title="Offers">
          <p>Published offers could not be loaded.</p>
        </ErrorState>
      </section>
    );
  }
}
