import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { JsonLd } from "@/components/discovery/json-ld";
import { SearchField } from "@/components/discovery/search-field";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { auth } from "@/auth";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { siteOrigin } from "@/lib/seo/site";
import { websiteSearchData } from "@/lib/seo/structured";
import { searchPublished, writeSearchEvent } from "@/modules/search/service";
import { recordProductEvent } from "@/modules/analytics/service";
import {
  consentFromCookie,
  normalizeSearchQuery,
  parseSearchKind,
  readRecentSearches,
  searchKinds,
  type SearchHit,
  type SearchKind,
} from "@/modules/search/query";

const kindLabel: Record<SearchKind, string> = {
  resorts: "Resorts",
  offers: "Offers",
  atolls: "Atolls",
  islands: "Islands",
  experiences: "Experiences",
  guides: "Guides",
  collections: "Collections",
};

type PageProps = { searchParams: Promise<{ q?: string; type?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = normalizeSearchQuery(params.q ?? "");
  return publicMetadata({
    title: query.length > 0 ? `Search: ${query}` : "Search",
    description: "Search published pages.",
    path: query.length > 0 ? `/search?q=${encodeURIComponent(query)}` : "/search",
  });
}

function grouped(hits: SearchHit[]): Record<SearchKind, SearchHit[]> {
  const groups = {
    resorts: [],
    offers: [],
    atolls: [],
    islands: [],
    experiences: [],
    guides: [],
    collections: [],
  } as Record<SearchKind, SearchHit[]>;
  for (const hit of hits) groups[hit.kind].push(hit);
  return groups;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = normalizeSearchQuery(params.q ?? "");
  const kind = parseSearchKind(params.type);
  const store = await cookies();
  const recent = readRecentSearches(store.get("me_recent")?.value);
  try {
    const hits = query.length > 0 ? await searchPublished(query, kind) : [];
    if (query.length > 0) {
      const session = await auth().catch(() => null);
      try {
        await writeSearchEvent({
          query,
          resultCount: hits.length,
          consent: consentFromCookie(store.get("me_analytics")?.value),
          anonymousKey: store.get("me_anon")?.value,
          userId: session?.user?.id || undefined,
        });
      } catch (error) {
        logError(error instanceof Error ? error.message : "The search event could not be stored.");
      }
    }
    if (kind !== "all") {
      try {
        await recordProductEvent({
          name: "filter_applied",
          consent: consentFromCookie(store.get("me_analytics")?.value),
          anonymousKey: store.get("me_anon")?.value,
          userId: (await auth().catch(() => null))?.user?.id,
          properties: { kind },
        });
      } catch (error) {
        logError(error instanceof Error ? error.message : "The filter event could not be stored.");
      }
    }
    const groups = grouped(hits);
    const visibleKinds = kind === "all" ? searchKinds : [kind];
    return (
      <section className="grid max-w-[65ch] gap-6">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Search" }]} />
        <JsonLd data={websiteSearchData(siteOrigin())} />
        <h1>Search</h1>
        <SearchField initialQuery={query} />
        <nav aria-label="Result types" className="flex flex-wrap gap-x-4 gap-y-2">
          <Link
            href={query.length > 0 ? `/search?q=${encodeURIComponent(query)}` : "/search"}
            className="text-lagoon-ink"
            aria-current={kind === "all" ? "page" : undefined}
          >
            All
          </Link>
          {searchKinds.map((item) => (
            <Link
              key={item}
              href={
                query.length > 0
                  ? `/search?q=${encodeURIComponent(query)}&type=${item}`
                  : `/search?type=${item}`
              }
              className="text-lagoon-ink"
              aria-current={kind === item ? "page" : undefined}
            >
              {kindLabel[item]}
            </Link>
          ))}
        </nav>
        {recent.length > 0 ? (
          <section className="grid gap-2">
            <h2>Recent searches</h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {recent.map((item) => (
                <li key={item}>
                  <Link href={`/search?q=${encodeURIComponent(item)}`} className="text-lagoon-ink">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {query.length === 0 ? (
          <EmptyState title="Start a search">
            <p>Enter a word to search published pages.</p>
          </EmptyState>
        ) : hits.length === 0 ? (
          <EmptyState title="No published matches">
            <p>Nothing published matches that search.</p>
            <ul className="grid gap-2">
              <li>
                <Link href="/resorts" className="text-lagoon-ink">
                  Resorts
                </Link>
              </li>
              <li>
                <Link href="/destinations" className="text-lagoon-ink">
                  Destinations
                </Link>
              </li>
              <li>
                <Link href="/guides" className="text-lagoon-ink">
                  Guides
                </Link>
              </li>
            </ul>
          </EmptyState>
        ) : (
          visibleKinds.map((item) =>
            groups[item].length > 0 ? (
              <section key={item} className="grid gap-3">
                <h2>{kindLabel[item]}</h2>
                <ul className="grid gap-4">
                  {groups[item].map((hit) => (
                    <li key={hit.id} className="grid gap-1">
                      <Link href={hit.href} className="text-lagoon-ink">
                        {hit.name}
                      </Link>
                      {hit.summary ? <p>{hit.summary}</p> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )
        )}
      </section>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "Search could not be completed.");
    return (
      <ErrorState title="Search">
        <p>Search could not be completed.</p>
      </ErrorState>
    );
  }
}
