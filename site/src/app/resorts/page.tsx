import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/patterns/page-header";
import { ResortCard } from "@/components/patterns/resort-card";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { listLeadResortImages, listPublishedResorts } from "@/modules/catalog";
import { db } from "@/lib/db";

export const metadata: Metadata = publicMetadata({
  title: "Maldives Luxury Resorts Collection",
  description: "Curated collection of the Maldives' premier private island resorts, overwater villas, and house reefs.",
  path: "/resorts",
});

const crumbs = [{ name: "Home", href: "/" }, { name: "Resorts" }];

type PageProps = {
  searchParams?: Promise<{ atoll?: string }>;
};

export default async function ResortsPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const selectedAtoll = resolvedParams.atoll;

  try {
    const [allResorts, atolls] = await Promise.all([
      listPublishedResorts(),
      db.atoll.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const resorts = selectedAtoll
      ? allResorts.filter(
          (r) =>
            r.island.status === "PUBLISHED" &&
            r.island.atoll.status === "PUBLISHED" &&
            r.island.atoll.slug === selectedAtoll,
        )
      : allResorts;

    if (allResorts.length === 0) {
      return (
        <div className="grid gap-8">
          <PageHeader crumbs={crumbs} title="Resorts" />
          <EmptyState
            title="No resort is published yet"
            action={
              <Link href="/plan" className="font-semibold text-lagoon-ink underline">
                Tell us what you are looking for
              </Link>
            }
          >
            <p>Resorts appear here once our team has published them. You can still plan a trip.</p>
          </EmptyState>
        </div>
      );
    }

    const images = await listLeadResortImages(allResorts.map((resort) => resort.id));

    return (
      <div className="grid gap-8">
        <PageHeader
          crumbs={crumbs}
          title="Luxury Resorts"
          lede={`${allResorts.length} hand-curated private island sanctuaries across the Maldivian atolls. Save properties to your shortlist to compare details.`}
        />

        {/* Atoll Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap border-b border-border-subtle/80">
          <span className="text-xs font-bold uppercase tracking-wider text-muted mr-1 shrink-0">Filter Atoll:</span>
          <Link
            href="/resorts"
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              !selectedAtoll
                ? "bg-lagoon-ink text-white dark:bg-cyan-500 dark:text-[#041d24] shadow-sm"
                : "bg-white dark:bg-white/10 text-ink dark:text-sand border border-border-subtle dark:border-white/15 hover:border-ocean dark:hover:border-cyan-400"
            }`}
          >
            All Atolls ({allResorts.length})
          </Link>
          {atolls.map((atoll) => {
            const isSelected = selectedAtoll === atoll.slug;
            return (
              <Link
                key={atoll.slug}
                href={`/resorts?atoll=${atoll.slug}`}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-lagoon-ink text-white dark:bg-cyan-500 dark:text-[#041d24] shadow-sm"
                    : "bg-white dark:bg-white/10 text-ink dark:text-sand border border-border-subtle dark:border-white/15 hover:border-ocean dark:hover:border-cyan-400"
                }`}
              >
                {atoll.name}
              </Link>
            );
          })}
        </div>

        {resorts.length === 0 ? (
          <EmptyState title="No resorts in this atoll">
            <p>We do not have published resorts in this atoll yet.</p>
            <Link href="/resorts" className="mt-3 inline-block font-semibold text-lagoon-ink underline">
              View all resorts
            </Link>
          </EmptyState>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {resorts.map((resort) => (
              <li key={resort.id}>
                <ResortCard
                  resort={{
                    slug: resort.slug,
                    name: resort.name,
                    summary: resort.summary,
                    image: images.get(resort.id) ?? null,
                    location:
                      resort.island.status === "PUBLISHED"
                        ? [
                            resort.island.name,
                            resort.island.atoll.status === "PUBLISHED"
                              ? resort.island.atoll.name
                              : null,
                          ]
                            .filter(Boolean)
                            .join(", ")
                        : null,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "Published resorts could not be loaded.");
    return (
      <ErrorState title="Resorts">
        <p>Published resorts could not be loaded.</p>
      </ErrorState>
    );
  }
}
