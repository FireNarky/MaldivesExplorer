import { isExplicitLocalEnvironment } from "@/lib/env/schema";

/**
 * Public visibility policy for automated browser/test fixtures.
 *
 * `scripts/prepare-browser-discovery.ts` publishes real-looking records so browser checks can
 * exercise discovery. They are identified by a reserved slug prefix (every slugged fixture) and a
 * fixed question text (FAQs have no slug). Every public read path builds its `where` clause from
 * this module, so fixtures are excluded at the data boundary instead of on individual pages.
 *
 * Fixtures are visible only when `ALLOW_TEST_FIXTURES=true` is set explicitly and `APP_ENV` is
 * explicitly and exactly `local`. An unset or empty `APP_ENV` is NOT treated as local here; the
 * gate fails closed, as do staging, preview, production, and any unrecognised value.
 */

export const TEST_FIXTURE_SLUG_PREFIX = "browser-";
export const TEST_FIXTURE_FAQ_QUESTIONS = ["Browser question"] as const;

type Source = Record<string, string | undefined>;

export function testFixturesAllowed(source: Source = process.env): boolean {
  return source.ALLOW_TEST_FIXTURES === "true" && isExplicitLocalEnvironment(source);
}

export function isTestFixtureSlug(slug: string): boolean {
  return slug.startsWith(TEST_FIXTURE_SLUG_PREFIX);
}

/** True when a record with this slug must not be shown publicly (fixture and not allowed). */
export function isHiddenFixtureSlug(slug: string, source: Source = process.env): boolean {
  return isTestFixtureSlug(slug) && !testFixturesAllowed(source);
}

/** Prisma `where` fragment for any model that has `status` and `slug`. */
export function publishedPublic(source: Source = process.env) {
  if (testFixturesAllowed(source)) return { status: "PUBLISHED" as const };
  return {
    status: "PUBLISHED" as const,
    NOT: { slug: { startsWith: TEST_FIXTURE_SLUG_PREFIX } },
  };
}

/** Prisma `where` fragment for slugged models whose status is checked elsewhere. */
export function notTestFixture(source: Source = process.env) {
  if (testFixturesAllowed(source)) return {};
  return { NOT: { slug: { startsWith: TEST_FIXTURE_SLUG_PREFIX } } };
}

/** Prisma `where` fragment for published FAQs (FAQs have no slug). */
export function publishedPublicFaq(source: Source = process.env) {
  if (testFixturesAllowed(source)) return { status: "PUBLISHED" as const };
  return {
    status: "PUBLISHED" as const,
    NOT: { question: { in: [...TEST_FIXTURE_FAQ_QUESTIONS] } },
  };
}

/**
 * Raw SQL predicate for the search queries. `column` is always a trusted literal from this
 * repository, never user input.
 */
export function fixtureGuardSql(column: string, source: Source = process.env): string {
  if (testFixturesAllowed(source)) return "";
  return `\n    AND ${column} NOT LIKE '${TEST_FIXTURE_SLUG_PREFIX}%'`;
}
