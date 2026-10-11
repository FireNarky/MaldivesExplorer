export const searchKinds = [
  "resorts",
  "atolls",
  "islands",
  "experiences",
  "guides",
  "collections",
] as const;

export type SearchKind = (typeof searchKinds)[number];

export type SearchHit = {
  id: string;
  name: string;
  href: string;
  summary: string;
  kind: SearchKind;
};

export type SearchSuggestion = {
  label: string;
  href: string;
  kind: SearchKind;
};

export const resortSearchSql = `
  SELECT id, name, slug, summary,
         ts_rank(search_vector, websearch_to_tsquery('english', $1))::float8 AS rank
  FROM resorts
  WHERE status = 'PUBLISHED'
    AND search_vector @@ websearch_to_tsquery('english', $1)
  ORDER BY rank DESC
  LIMIT 8
`;

export const atollSearchSql = `
  SELECT id, name, slug, summary,
         ts_rank(search_vector, websearch_to_tsquery('english', $1))::float8 AS rank
  FROM atolls
  WHERE status = 'PUBLISHED'
    AND search_vector @@ websearch_to_tsquery('english', $1)
  ORDER BY rank DESC
  LIMIT 8
`;

export const islandSearchSql = `
  SELECT id, name, slug, summary,
         ts_rank(search_vector, websearch_to_tsquery('english', $1))::float8 AS rank
  FROM islands
  WHERE status = 'PUBLISHED'
    AND search_vector @@ websearch_to_tsquery('english', $1)
  ORDER BY rank DESC
  LIMIT 8
`;

export const experienceSearchSql = `
  SELECT id, name, slug, summary,
         ts_rank(search_vector, websearch_to_tsquery('english', $1))::float8 AS rank
  FROM experiences
  WHERE status = 'PUBLISHED'
    AND search_vector @@ websearch_to_tsquery('english', $1)
  ORDER BY rank DESC
  LIMIT 8
`;

export const guideSearchSql = `
  SELECT id, title, slug, excerpt,
         ts_rank(search_vector, websearch_to_tsquery('english', $1))::float8 AS rank
  FROM articles
  WHERE status = 'PUBLISHED'
    AND search_vector @@ websearch_to_tsquery('english', $1)
  ORDER BY rank DESC
  LIMIT 8
`;

export const collectionSearchSql = `
  SELECT id, title, slug, summary
  FROM collections
  WHERE status = 'PUBLISHED'
    AND (title ILIKE $1 ESCAPE '\\' OR summary ILIKE $1 ESCAPE '\\')
  ORDER BY title ASC
  LIMIT 8
`;

export const resortSuggestSql = `
  SELECT name, slug
  FROM resorts
  WHERE status = 'PUBLISHED' AND similarity(name, $1) > 0.2
  ORDER BY similarity(name, $1) DESC
  LIMIT 5
`;

export const atollSuggestSql = `
  SELECT name, slug
  FROM atolls
  WHERE status = 'PUBLISHED' AND similarity(name, $1) > 0.2
  ORDER BY similarity(name, $1) DESC
  LIMIT 5
`;

export const islandSuggestSql = `
  SELECT name, slug
  FROM islands
  WHERE status = 'PUBLISHED' AND similarity(name, $1) > 0.2
  ORDER BY similarity(name, $1) DESC
  LIMIT 5
`;

export const experienceSuggestSql = `
  SELECT name, slug
  FROM experiences
  WHERE status = 'PUBLISHED' AND similarity(name, $1) > 0.2
  ORDER BY similarity(name, $1) DESC
  LIMIT 5
`;

export const guideSuggestSql = `
  SELECT title, slug
  FROM articles
  WHERE status = 'PUBLISHED' AND similarity(title, $1) > 0.2
  ORDER BY similarity(title, $1) DESC
  LIMIT 5
`;

export function normalizeSearchQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

export function parseSearchKind(value: string | undefined): SearchKind | "all" {
  if (value && (searchKinds as readonly string[]).includes(value)) return value as SearchKind;
  return "all";
}

export function containsPattern(query: string): string {
  return `%${query.replace(/[%_\\]/g, "\\$&")}%`;
}

export type SearchConsent = "GRANTED" | "DENIED" | "UNKNOWN";

export function consentFromCookie(value: string | undefined): SearchConsent {
  if (value === "granted") return "GRANTED";
  if (value === "denied") return "DENIED";
  return "UNKNOWN";
}

export function shouldRecordSearch(consent: SearchConsent): boolean {
  return consent === "GRANTED";
}

export function readRecentSearches(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split("|")
    .map((item) => {
      try {
        return decodeURIComponent(item);
      } catch {
        return "";
      }
    })
    .map((item) => normalizeSearchQuery(item))
    .filter((item) => item.length > 0)
    .slice(0, 5);
}

export function writeRecentSearches(current: string | undefined, query: string): string {
  const next = normalizeSearchQuery(query);
  const previous = readRecentSearches(current).filter((item) => item !== next);
  return [next, ...previous]
    .slice(0, 5)
    .map((item) => encodeURIComponent(item))
    .join("|");
}
