import type { Metadata } from "next";
import { PageHeader } from "@/components/patterns/page-header";
import { DestinationCard } from "@/components/patterns/destination-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { db } from "@/lib/db";

export const metadata: Metadata = publicMetadata({
  title: "Maldives Destinations & Atolls",
  description: "Explore 26 natural geographic atolls, UNESCO Biosphere Reserves, and pristine island channels.",
  path: "/destinations",
});

export default async function DestinationsPage() {
  try {
    const atolls = await db.atoll.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        summary: true,
        latitude: true,
        longitude: true,
        islands: { where: { status: "PUBLISHED" }, select: { id: true } },
      },
    });

    return (
      <div className="grid gap-10">
        <PageHeader
          crumbs={[{ name: "Home", href: "/" }, { name: "Destinations" }]}
          title="Destinations & Atolls"
          lede="The Maldives stretches across 26 natural geographic atolls, each defined by distinct marine ecosystems, coral thilas, and private island hideaways."
        />

        {atolls.length === 0 ? (
          <EmptyState title="Atolls">
            <p>No atolls are published yet.</p>
          </EmptyState>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {atolls.map((atoll) => (
              <DestinationCard
                key={atoll.id}
                item={{
                  id: atoll.id,
                  name: atoll.name,
                  slug: atoll.slug,
                  summary: atoll.summary,
                  latitude: atoll.latitude ? Number(atoll.latitude) : null,
                  longitude: atoll.longitude ? Number(atoll.longitude) : null,
                  islandCount: atoll.islands.length,
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "Destinations could not be loaded.");
    return (
      <ErrorState title="Destinations">
        <p>Destinations could not be loaded.</p>
      </ErrorState>
    );
  }
}
