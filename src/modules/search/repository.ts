import { db } from "@/lib/db";
import type { SearchHit, SearchKind, SearchSuggestion } from "@/modules/search/query";
import {
  atollSearchSql,
  atollSuggestSql,
  collectionSearchSql,
  containsPattern,
  experienceSearchSql,
  experienceSuggestSql,
  guideSearchSql,
  guideSuggestSql,
  islandSearchSql,
  islandSuggestSql,
  resortSearchSql,
  resortSuggestSql,
} from "@/modules/search/query";

type RankedName = { id: string; name: string; slug: string; summary: string; rank: number };
type RankedTitle = { id: string; title: string; slug: string; excerpt: string; rank: number };
type CollectionRow = { id: string; title: string; slug: string; summary: string };
type NameSuggestion = { name: string; slug: string };
type TitleSuggestion = { title: string; slug: string };

function hit(
  row: { id: string; slug: string; summary: string },
  name: string,
  href: string,
  kind: SearchKind,
): SearchHit {
  return { id: row.id, name, href, summary: row.summary, kind };
}

async function ranked(
  sql: string,
  query: string,
  kind: SearchKind,
  hrefFor: (slug: string) => string,
): Promise<SearchHit[]> {
  const rows = await db.$queryRawUnsafe<RankedName[]>(sql, query);
  return rows.map((row) => hit(row, row.name, hrefFor(row.slug), kind));
}

export async function searchPublishedRecords(
  query: string,
  kind: SearchKind | "all",
): Promise<SearchHit[]> {
  const groups: Array<Promise<SearchHit[]>> = [];
  if (kind === "all" || kind === "resorts") {
    groups.push(ranked(resortSearchSql, query, "resorts", (slug) => `/resorts/${slug}`));
  }
  if (kind === "all" || kind === "atolls") {
    groups.push(ranked(atollSearchSql, query, "atolls", (slug) => `/atolls/${slug}`));
  }
  if (kind === "all" || kind === "islands") {
    groups.push(ranked(islandSearchSql, query, "islands", (slug) => `/islands/${slug}`));
  }
  if (kind === "all" || kind === "experiences") {
    groups.push(
      ranked(experienceSearchSql, query, "experiences", (slug) => `/experiences/${slug}`),
    );
  }
  if (kind === "all" || kind === "guides") {
    groups.push(
      db.$queryRawUnsafe<RankedTitle[]>(guideSearchSql, query).then((rows) =>
        rows.map((row) => ({
          id: row.id,
          name: row.title,
          href: `/guides/${row.slug}`,
          summary: row.excerpt,
          kind: "guides" as const,
        })),
      ),
    );
  }
  if (kind === "all" || kind === "collections") {
    groups.push(
      db
        .$queryRawUnsafe<CollectionRow[]>(collectionSearchSql, containsPattern(query))
        .then((rows) =>
          rows.map((row) => ({
            id: row.id,
            name: row.title,
            href: `/collections/${row.slug}`,
            summary: row.summary,
            kind: "collections" as const,
          })),
        ),
    );
  }
  const results = await Promise.all(groups);
  return results.flat();
}

async function suggestNames(
  sql: string,
  query: string,
  kind: SearchKind,
  hrefFor: (slug: string) => string,
): Promise<SearchSuggestion[]> {
  const rows = await db.$queryRawUnsafe<NameSuggestion[]>(sql, query);
  return rows.map((row) => ({ label: row.name, href: hrefFor(row.slug), kind }));
}

export async function suggestPublishedRecords(query: string): Promise<SearchSuggestion[]> {
  const [resorts, atolls, islands, experiences, guides] = await Promise.all([
    suggestNames(resortSuggestSql, query, "resorts", (slug) => `/resorts/${slug}`),
    suggestNames(atollSuggestSql, query, "atolls", (slug) => `/atolls/${slug}`),
    suggestNames(islandSuggestSql, query, "islands", (slug) => `/islands/${slug}`),
    suggestNames(experienceSuggestSql, query, "experiences", (slug) => `/experiences/${slug}`),
    db.$queryRawUnsafe<TitleSuggestion[]>(guideSuggestSql, query).then((rows) =>
      rows.map((row) => ({
        label: row.title,
        href: `/guides/${row.slug}`,
        kind: "guides" as const,
      })),
    ),
  ]);
  return [...resorts, ...atolls, ...islands, ...experiences, ...guides].slice(0, 8);
}
