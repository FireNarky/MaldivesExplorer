import { describe, expect, it } from "vitest";
import { publicMetadata } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/seo/site";
import { breadcrumbData, faqPageData, placeData } from "@/lib/seo/structured";
import { redirectPathError } from "@/modules/redirects/service";
import {
  atollSearchSql,
  collectionSearchSql,
  consentFromCookie,
  containsPattern,
  guideSearchSql,
  guideSuggestSql,
  normalizeSearchQuery,
  parseSearchKind,
  readRecentSearches,
  resortSearchSql,
  shouldRecordSearch,
  writeRecentSearches,
} from "@/modules/search/query";

describe("discovery search contracts", () => {
  it("keeps full-text queries on published rows", () => {
    for (const sql of [resortSearchSql, atollSearchSql, guideSearchSql]) {
      expect(sql).toContain("status = 'PUBLISHED'");
      expect(sql).toContain("search_vector @@ websearch_to_tsquery('english', $1)");
    }
    expect(collectionSearchSql).toContain("status = 'PUBLISHED'");
    expect(guideSuggestSql).toContain("status = 'PUBLISHED'");
    expect(guideSuggestSql).toContain("similarity(title, $1)");
  });

  it("normalizes a search query and its type", () => {
    expect(normalizeSearchQuery("  reef   house  ")).toBe("reef house");
    expect(normalizeSearchQuery("a".repeat(90))).toHaveLength(80);
    expect(parseSearchKind("guides")).toBe("guides");
    expect(parseSearchKind("offers")).toBe("offers");
    expect(containsPattern("100%")).toBe("%100\\%%");
  });

  it("records search analytics only after consent is granted", () => {
    expect(consentFromCookie(undefined)).toBe("UNKNOWN");
    expect(consentFromCookie("denied")).toBe("DENIED");
    expect(consentFromCookie("granted")).toBe("GRANTED");
    expect(shouldRecordSearch("GRANTED")).toBe(true);
    expect(shouldRecordSearch("DENIED")).toBe(false);
    expect(shouldRecordSearch("UNKNOWN")).toBe(false);
  });

  it("keeps a short list of recent searches", () => {
    const stored = writeRecentSearches(undefined, "reef");
    const next = writeRecentSearches(stored, "lagoon");
    expect(readRecentSearches(next)).toEqual(["lagoon", "reef"]);
  });
});

describe("discovery SEO contracts", () => {
  it("adds canonical and Open Graph metadata without opening the site to indexing", () => {
    const metadata = publicMetadata({
      title: "Reef",
      description: "A published place.",
      path: "/atolls/reef",
    });
    expect(metadata.alternates).toMatchObject({
      canonical: absoluteUrl("/atolls/reef"),
    });
    expect(metadata.openGraph).toMatchObject({
      title: "Reef",
      url: absoluteUrl("/atolls/reef"),
    });
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });

  it("builds breadcrumb, place, and FAQ structured data", () => {
    const crumbs = breadcrumbData([{ name: "Home", href: "/" }, { name: "Reef" }]);
    const elements = crumbs.itemListElement as Array<{ position: number }>;
    expect(elements[0]?.position).toBe(1);
    expect(elements[1]?.position).toBe(2);
    expect(placeData({ name: "Reef", description: "Place", path: "/atolls/reef" })).toMatchObject({
      "@type": "Place",
    });
    expect(faqPageData([{ question: "When", answer: "Today" }])).toMatchObject({
      "@type": "FAQPage",
    });
  });

  it("rejects a redirect that would capture a staff or API path", () => {
    expect(redirectPathError("/admin/catalog", "/resorts")).toBeTruthy();
    expect(redirectPathError("/atolls/old", "/atolls/old")).toBeTruthy();
    expect(redirectPathError("/atolls/old", "/atolls/new")).toBeNull();
  });
});
