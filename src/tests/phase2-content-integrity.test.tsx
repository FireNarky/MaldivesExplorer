import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { Prisma } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  default: vi.fn(),
  AuthError: class AuthError extends Error {},
}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Server-component actions that need a session are not under test here.
vi.mock("@/components/shortlist/listing-actions", () => ({
  ListingActions: () => null,
}));

import { LoginForm } from "@/app/login/login-form";
import LoginPage from "@/app/login/page";
import RegisterPage from "@/app/register/page";
import ResortPage from "@/app/resorts/[slug]/page";
import ExperiencePage from "@/app/experiences/[slug]/page";
import GuidePage from "@/app/guides/[slug]/page";
import GuidesPage from "@/app/guides/page";
import ExperiencesPage from "@/app/experiences/page";
import NewsletterPage from "@/app/newsletter/page";
import { SocialOAuthButtons } from "@/components/auth/social-oauth-buttons";
import { DetailHero } from "@/components/discovery/detail-hero";
import { db } from "@/lib/db";
import { configuredOAuthProviders, oauthCredentials, verifiedOAuthEmail } from "@/lib/auth/oauth";
import { uatQuickFill } from "@/lib/auth/uat";
import * as analyticsMod from "@/modules/analytics/service";
import * as catalogMod from "@/modules/catalog";
import { attributeValue, uniqueLabels, type CompareColumn } from "@/modules/compare/attributes";
import { loadCompareColumns } from "@/modules/compare/service";
import * as discoveryMod from "@/modules/discovery";
import {
  fixtureGuardSql,
  isHiddenFixtureSlug,
  notTestFixture,
  publishedPublic,
  publishedPublicFaq,
  TEST_FIXTURE_FAQ_QUESTIONS,
  TEST_FIXTURE_SLUG_PREFIX,
  testFixturesAllowed,
} from "@/modules/discovery/visibility";
import { oauthSignIn } from "@/modules/identity/actions";
import { listLeadMedia } from "@/modules/media";
import * as newsletterMod from "@/modules/newsletter/service";
import * as reviewMod from "@/modules/reviews/service";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const hiddenFilter = { NOT: { slug: { startsWith: "browser-" } } };
// The only configuration that may show fixtures: explicit opt-in AND APP_ENV exactly "local".
const allowed = { ALLOW_TEST_FIXTURES: "true", APP_ENV: "local" };

function whereOf(spy: { mock: { calls: unknown[][] } }): unknown {
  const first = spy.mock.calls[0]?.[0] as { where?: unknown } | undefined;
  return first?.where;
}

describe("Phase 2 — fixture visibility policy (F-04)", () => {
  it("hides browser-* fixtures unless the explicit local opt-in is set", () => {
    expect(testFixturesAllowed({})).toBe(false);
    expect(testFixturesAllowed({ ALLOW_TEST_FIXTURES: "yes" })).toBe(false);
    expect(testFixturesAllowed({ ALLOW_TEST_FIXTURES: "true" })).toBe(false);
    expect(testFixturesAllowed({ ALLOW_TEST_FIXTURES: "true", APP_ENV: "local" })).toBe(true);
  });

  it("shows fixtures only when APP_ENV is explicitly and exactly local", () => {
    expect(testFixturesAllowed({ ALLOW_TEST_FIXTURES: "true", APP_ENV: "local" })).toBe(true);
  });

  it("fails closed when APP_ENV is missing", () => {
    expect(testFixturesAllowed({ ALLOW_TEST_FIXTURES: "true" })).toBe(false);
    expect(testFixturesAllowed({ ALLOW_TEST_FIXTURES: "true", APP_ENV: undefined })).toBe(false);
  });

  it("fails closed when APP_ENV is empty", () => {
    expect(testFixturesAllowed({ ALLOW_TEST_FIXTURES: "true", APP_ENV: "" })).toBe(false);
    expect(testFixturesAllowed({ ALLOW_TEST_FIXTURES: "true", APP_ENV: "   " })).toBe(false);
  });

  it("fails closed for production, staging, and preview", () => {
    for (const appEnv of ["production", "staging", "preview"]) {
      expect(testFixturesAllowed({ ALLOW_TEST_FIXTURES: "true", APP_ENV: appEnv })).toBe(false);
    }
  });

  it("fails closed for unknown and malformed APP_ENV values", () => {
    for (const appEnv of [
      "random",
      "not-an-environment",
      "Local",
      "LOCAL",
      " local",
      "local ",
      "localhost",
      "local\n",
    ]) {
      expect(testFixturesAllowed({ ALLOW_TEST_FIXTURES: "true", APP_ENV: appEnv }), appEnv).toBe(
        false,
      );
    }
  });

  it("applies the same fail-closed rule to every fixture helper", () => {
    for (const appEnv of [undefined, "", "production", "staging", "preview", "random"]) {
      const source = { ALLOW_TEST_FIXTURES: "true", APP_ENV: appEnv };
      expect(publishedPublic(source)).toEqual({ status: "PUBLISHED", ...hiddenFilter });
      expect(notTestFixture(source)).toEqual(hiddenFilter);
      expect(isHiddenFixtureSlug("browser-resort", source)).toBe(true);
      expect(fixtureGuardSql("slug", source)).toContain("NOT LIKE 'browser-%'");
    }
  });

  it("builds Prisma filters at the data boundary", () => {
    expect(publishedPublic({})).toEqual({ status: "PUBLISHED", ...hiddenFilter });
    expect(publishedPublic(allowed)).toEqual({ status: "PUBLISHED" });
    expect(notTestFixture({})).toEqual(hiddenFilter);
    expect(notTestFixture(allowed)).toEqual({});
    expect(publishedPublicFaq({})).toEqual({
      status: "PUBLISHED",
      NOT: { question: { in: ["Browser question"] } },
    });
    expect(publishedPublicFaq(allowed)).toEqual({ status: "PUBLISHED" });
  });

  it("identifies hidden fixture slugs and builds the raw SQL guard", () => {
    expect(isHiddenFixtureSlug("browser-resort", {})).toBe(true);
    expect(isHiddenFixtureSlug("baros-maldives", {})).toBe(false);
    expect(isHiddenFixtureSlug("browser-resort", allowed)).toBe(false);
    expect(fixtureGuardSql("slug", {})).toContain("slug NOT LIKE 'browser-%'");
    expect(fixtureGuardSql("slug", allowed)).toBe("");
  });

  it("applies the policy to every public discovery query", async () => {
    const atolls = vi.spyOn(db.atoll, "findMany").mockResolvedValue([]);
    const experiences = vi.spyOn(db.experience, "findMany").mockResolvedValue([]);
    const articles = vi.spyOn(db.article, "findMany").mockResolvedValue([]);
    const collections = vi.spyOn(db.collection, "findMany").mockResolvedValue([]);
    const faqs = vi.spyOn(db.faq, "findMany").mockResolvedValue([]);
    const experience = vi.spyOn(db.experience, "findFirst").mockResolvedValue(null);
    const article = vi.spyOn(db.article, "findFirst").mockResolvedValue(null);

    await discoveryMod.listPublishedAtolls();
    await discoveryMod.listPublishedExperiences();
    await discoveryMod.listPublishedGuides();
    await discoveryMod.listRecentPublishedGuides(3);
    await discoveryMod.listPublishedCollections();
    await discoveryMod.listGlobalFaqs();
    await discoveryMod.getPublishedExperience("browser-experience");
    await discoveryMod.getPublishedGuide("browser-guide");

    for (const spy of [atolls, experiences, articles, collections]) {
      expect(JSON.stringify(whereOf(spy))).toContain('"startsWith":"browser-"');
    }
    expect(JSON.stringify(whereOf(faqs))).toContain("Browser question");
    expect(JSON.stringify(whereOf(experience))).toContain('"startsWith":"browser-"');
    expect(JSON.stringify(whereOf(article))).toContain('"startsWith":"browser-"');
  });

  it("guards every public catalog read in the resort repository", async () => {
    const findMany = vi.spyOn(db.resort, "findMany").mockResolvedValue([]);
    const findFirst = vi.spyOn(db.resort, "findFirst").mockResolvedValue(null);
    await catalogMod.listPublishedResorts();
    await catalogMod.getPublishedResort("browser-resort");
    expect(JSON.stringify(whereOf(findMany))).toContain('"startsWith":"browser-"');
    expect(JSON.stringify(whereOf(findFirst))).toContain('"startsWith":"browser-"');
  });

  it("filters fixtures on the guide, experience, and newsletter pages", async () => {
    const articles = vi.spyOn(db.article, "findMany").mockResolvedValue([]);
    const experiences = vi.spyOn(db.experience, "findMany").mockResolvedValue([]);
    vi.spyOn(db.mediaLink, "findMany").mockResolvedValue([]);
    vi.spyOn(db.experienceCategory, "findMany").mockResolvedValue([]);
    render(await GuidesPage());
    render(await ExperiencesPage());
    expect(JSON.stringify(whereOf(articles))).toContain('"startsWith":"browser-"');
    expect(JSON.stringify(whereOf(experiences))).toContain('"startsWith":"browser-"');
  });

  it("emits the guard in every search and suggestion statement by default", async () => {
    vi.resetModules();
    const sql = await import("@/modules/search/query");
    const statements = Object.entries(sql).filter(
      ([name, value]) => /Sql$/.test(name) && typeof value === "string",
    ) as Array<[string, string]>;
    expect(statements.length).toBeGreaterThanOrEqual(13);
    for (const [name, statement] of statements) {
      expect(statement, name).toContain("NOT LIKE 'browser-%'");
    }
  });

  it("omits the SQL guard only when fixtures are explicitly allowed locally", async () => {
    vi.stubEnv("ALLOW_TEST_FIXTURES", "true");
    vi.stubEnv("APP_ENV", "local");
    vi.resetModules();
    const sql = await import("@/modules/search/query");
    expect(sql.resortSearchSql).not.toContain("browser-");
    vi.stubEnv("APP_ENV", "production");
    vi.resetModules();
    const production = await import("@/modules/search/query");
    expect(production.resortSearchSql).toContain("NOT LIKE 'browser-%'");
    for (const appEnv of [undefined, ""]) {
      vi.stubEnv("APP_ENV", appEnv);
      vi.resetModules();
      const unset = await import("@/modules/search/query");
      expect(unset.resortSearchSql).toContain("NOT LIKE 'browser-%'");
    }
  });

  it("returns an Unavailable column when compare is asked for a hidden fixture", async () => {
    const id = "11111111-1111-4111-8111-111111111111";
    vi.spyOn(db.resort, "findMany").mockResolvedValue([
      {
        id,
        name: "Browser Resort",
        slug: "browser-resort",
        status: "PUBLISHED",
        editorialPositioning: "Browser property.",
        hasHouseReef: null,
        priceBand: null,
        island: {
          name: "Browser Island",
          status: "PUBLISHED",
          atoll: { name: "A", status: "PUBLISHED" },
        },
        transfers: [],
        diningVenues: [],
        roomTypes: [],
        audiences: [],
      },
    ] as never);
    const [column] = await loadCompareColumns([id]);
    expect(column).toEqual({ id, name: "Unavailable", href: null, available: false, facts: null });
  });

  it("keeps the fixture script and the policy in sync", () => {
    const script = readFileSync(
      path.join(process.cwd(), "scripts", "prepare-browser-discovery.ts"),
      "utf8",
    );
    const slugs = [...script.matchAll(/slug: "([^"]+)"/g)].map((match) => match[1]!);
    expect(slugs.length).toBeGreaterThan(8);
    for (const slug of slugs) expect(slug.startsWith(TEST_FIXTURE_SLUG_PREFIX), slug).toBe(true);
    expect(script).toContain("TEST_FIXTURE_FAQ_QUESTIONS[0]");
    expect(TEST_FIXTURE_FAQ_QUESTIONS).toContain("Browser question");
  });
});

type ResortRecord = NonNullable<Awaited<ReturnType<typeof catalogMod.getPublishedResort>>>;

function resortRecord(overrides: Partial<ResortRecord> = {}): ResortRecord {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Test Reef Resort",
    slug: "test-reef-resort",
    summary: "A reef resort summary.",
    description: "A reef resort description.",
    propertyType: "RESORT",
    seoTitle: null,
    seoDescription: null,
    checkInNotes: null,
    hasHouseReef: null,
    reefSummary: null,
    diveCenterSummary: null,
    island: {
      name: "Test Island",
      slug: "test-island",
      status: "PUBLISHED",
      atoll: { name: "Test Atoll", slug: "test-atoll", status: "PUBLISHED" },
    },
    roomTypes: [],
    diningVenues: [],
    transfers: [],
    amenities: [],
    audiences: [],
    ...overrides,
  } as ResortRecord;
}

async function renderResort(record: ResortRecord): Promise<HTMLElement> {
  vi.spyOn(catalogMod, "getPublishedResort").mockResolvedValue(record);
  vi.spyOn(catalogMod, "listPublishedResortImages").mockResolvedValue([]);
  vi.spyOn(discoveryMod, "listPublishedExperiencesForResort").mockResolvedValue([]);
  vi.spyOn(discoveryMod, "listRelatedGuides").mockResolvedValue([]);
  vi.spyOn(discoveryMod, "listOwnerFaqs").mockResolvedValue([]);
  vi.spyOn(reviewMod, "listPublishedForResort").mockResolvedValue([]);
  vi.spyOn(analyticsMod, "notePublicView").mockResolvedValue(undefined);
  const view = await ResortPage({ params: Promise.resolve({ slug: record.slug }) });
  return render(view).container;
}

describe("Phase 2 — resort detail rendering (F-05)", () => {
  it("renders room size and guest limits, distinguishing adults from children", async () => {
    const container = await renderResort(
      resortRecord({
        roomTypes: [
          {
            id: "r1",
            name: "Reef Villa",
            description: "A villa on the reef.",
            maxAdults: 2,
            maxChildren: 2,
            sizeSqm: new Prisma.Decimal("120.50"),
          },
        ],
      }),
    );
    const text = container.textContent ?? "";
    expect(text).toContain("Reef Villa");
    expect(text).toContain("Size: 120.5 m²");
    expect(text).toContain("Maximum adults: 2");
    expect(text).toContain("Maximum children: 2");
  });

  it("does not imply anything the data does not record about rooms", async () => {
    const container = await renderResort(
      resortRecord({
        roomTypes: [
          {
            id: "r1",
            name: "Beach Bungalow",
            description: "",
            maxAdults: 3,
            maxChildren: 0,
            sizeSqm: null,
          },
        ],
      }),
    );
    const text = container.textContent ?? "";
    expect(text).toContain("Maximum adults: 3");
    expect(text).not.toContain("Maximum children");
    expect(text).not.toContain("Size:");
    expect(text).not.toMatch(/occupancy/i);
    expect(text).not.toMatch(/\bcot\b/i);
    expect(text).not.toMatch(/extra bed/i);
  });

  it("renders check-in notes, reef summary, house reef, and dive centre when present", async () => {
    const container = await renderResort(
      resortRecord({
        checkInNotes: "Check-in is from 14:00.",
        hasHouseReef: true,
        reefSummary: "A shallow reef off the beach.",
        diveCenterSummary: "A PADI dive centre.",
      }),
    );
    const text = container.textContent ?? "";
    expect(text).toContain("Check-in and arrival");
    expect(text).toContain("Check-in is from 14:00.");
    expect(text).toContain("Reef and diving");
    expect(text).toContain("House reef: Yes");
    expect(text).toContain("A shallow reef off the beach.");
    expect(text).toContain("A PADI dive centre.");
  });

  it("states a recorded absence of a house reef but stays silent when unknown", async () => {
    const none = await renderResort(resortRecord({ hasHouseReef: false }));
    expect(none.textContent).toContain("House reef: No");
    cleanup();
    const unknown = await renderResort(resortRecord({ hasHouseReef: null }));
    expect(unknown.textContent).not.toContain("House reef");
    expect(unknown.textContent).not.toContain("Reef and diving");
  });

  it("omits empty sections and never prints null or undefined", async () => {
    const container = await renderResort(resortRecord());
    const text = container.textContent ?? "";
    expect(text).not.toContain("Check-in and arrival");
    expect(text).not.toContain("Reef and diving");
    expect(text).not.toContain("Rooms");
    expect(text).not.toContain("Dining");
    expect(text).not.toContain("Good for");
    expect(text).not.toMatch(/\bnull\b/);
    expect(text).not.toMatch(/\bundefined\b/);
    expect(text).not.toMatch(/\bNaN\b/);
  });

  it("shows an honest neutral state for transfers when none are recorded", async () => {
    const container = await renderResort(resortRecord());
    expect(screen.getByRole("heading", { name: "Transfers" })).toBeTruthy();
    expect(container.textContent).toContain(
      "Transfer details have not been published for this resort.",
    );
    expect(container.textContent).not.toMatch(/seaplane|speedboat|domestic flight/i);
  });

  it("renders structured transfer records without inventing missing values", async () => {
    const container = await renderResort(
      resortRecord({
        transfers: [
          {
            id: "t1",
            label: "From the airport",
            durationMinutes: 45,
            durationBasis: "typical",
            notes: "Daylight only.",
            transferType: { label: "Seaplane" },
          },
          {
            id: "t2",
            label: "Alternative",
            durationMinutes: null,
            durationBasis: null,
            notes: null,
            transferType: { label: "Speedboat" },
          },
        ],
      }),
    );
    const text = container.textContent ?? "";
    expect(text).toContain("Seaplane");
    expect(text).toContain("Duration: 45 minutes (typical)");
    expect(text).toContain("Daylight only.");
    expect(text).toContain("Speedboat");
    expect(text.match(/Duration:/g)).toHaveLength(1);
    expect(text).not.toContain("Transfer details have not been published");
  });

  it("renders meal plans from the venue records, de-duplicated like /compare", async () => {
    const venues = [
      {
        id: "v1",
        name: "Reef Grill",
        description: "Grill dining.",
        cuisine: "Grill",
        mealPlans: [{ mealPlan: { label: "Half Board" } }, { mealPlan: { label: "Full Board" } }],
      },
      {
        id: "v2",
        name: "Lagoon Cafe",
        description: "",
        cuisine: null,
        mealPlans: [{ mealPlan: { label: "Half Board" } }],
      },
    ];
    const container = await renderResort(resortRecord({ diningVenues: venues }));
    const text = container.textContent ?? "";
    expect(text).toContain("Meal plans: Half Board; Full Board");
    expect(text.match(/Half Board/g)).toHaveLength(1);

    const canonical = uniqueLabels(
      venues.flatMap((venue) => venue.mealPlans.map((item) => item.mealPlan.label)),
    );
    const column: CompareColumn = {
      id: "c",
      name: "Test",
      href: "/resorts/test",
      available: true,
      facts: {
        islandName: null,
        atollName: null,
        transfers: [],
        priceBand: null,
        mealPlans: canonical,
        villaTypes: [],
        audiences: [],
        houseReef: null,
        positioning: null,
      },
    };
    expect(attributeValue("Meal plans", column)).toBe(canonical.join("; "));
  });

  it("does not infer a meal plan when none is recorded", async () => {
    const container = await renderResort(
      resortRecord({
        diningVenues: [
          { id: "v1", name: "Reef Grill", description: "Grill.", cuisine: null, mealPlans: [] },
        ],
      }),
    );
    const text = container.textContent ?? "";
    expect(text).toContain("Meal plan details have not been published for this resort.");
    expect(text).not.toMatch(/half board|full board|all.inclusive|bed and breakfast/i);
  });

  it("renders audiences only from the recorded audience tags", async () => {
    const container = await renderResort(
      resortRecord({
        audiences: [{ audienceTagId: "a1", audienceTag: { name: "Adults Only" } }],
      }),
    );
    expect(container.textContent).toContain("Good for");
    expect(container.textContent).toContain("Adults Only");
  });

  it("keeps the seed from inferring audiences, transfers, or meal plans", () => {
    const seed = readFileSync(path.join(process.cwd(), "scripts", "seed-rich-catalog.ts"), "utf8");
    const block = seed.slice(seed.indexOf("const explicitAudiences"));
    const links = [
      ...block.slice(0, block.indexOf("for (const link")).matchAll(/resortSlug: "([^"]+)"/g),
    ];
    expect(links.map((match) => match[1])).toEqual(["hurawalhi-island-resort", "soneva-fushi"]);
    expect(seed).not.toMatch(/db\.transferOption\./);
    expect(seed).not.toMatch(/db\.diningVenueMealPlan\./);
  });
});

describe("Phase 2 — experience and guide hero media (F-07)", () => {
  type MediaLinks = Awaited<ReturnType<typeof db.mediaLink.findMany>>;
  const link = (
    ownerId: string,
    role: "HERO" | "GALLERY",
    id: string,
    altText: string | null,
    caption: string | null,
  ) => ({ ownerId, role, media: { id, altText, caption } }) as unknown as MediaLinks[number];

  it("queries only published, described images and returns stored alt text and captions", async () => {
    const spy = vi
      .spyOn(db.mediaLink, "findMany")
      .mockResolvedValue([
        link("e1", "GALLERY", "m-gallery", "Gallery alt", null),
        link("e1", "HERO", "m-hero", " Hero alt ", " A caption "),
        link("e2", "HERO", "m-nocaption", "Plain alt", "   "),
        link("e3", "HERO", "m-blank", "   ", null),
      ]);
    const lead = await listLeadMedia("EXPERIENCE", ["e1", "e2", "e3", "e4"]);
    const args = spy.mock.calls[0]![0] as { where: { media: unknown; ownerType: string } };
    expect(args.where.ownerType).toBe("EXPERIENCE");
    expect(args.where.media).toEqual({
      status: "PUBLISHED",
      kind: { in: ["IMAGE", "DRONE"] },
      altText: { not: null },
    });
    expect(lead.get("e1")).toEqual({ id: "m-hero", altText: "Hero alt", caption: "A caption" });
    expect(lead.get("e2")).toEqual({ id: "m-nocaption", altText: "Plain alt", caption: null });
    expect(lead.has("e3")).toBe(false);
    expect(lead.has("e4")).toBe(false);
  });

  it("does not query when there is nothing to look up", async () => {
    const spy = vi.spyOn(db.mediaLink, "findMany");
    expect((await listLeadMedia("ARTICLE", [])).size).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it("renders the hero with its stored alt text and caption, and nothing without media", () => {
    const { container, rerender } = render(
      <DetailHero media={{ id: "m1", altText: "Manta rays at dusk", caption: "Hanifaru Bay." }} />,
    );
    const image = screen.getByAltText("Manta rays at dusk");
    expect(image.getAttribute("src")).toContain("/media/m1");
    expect(container.querySelector("figcaption")?.textContent).toBe("Hanifaru Bay.");
    rerender(<DetailHero media={{ id: "m2", altText: "Alt only", caption: null }} />);
    expect(container.querySelector("figcaption")).toBeNull();
    rerender(<DetailHero media={null} />);
    expect(container.innerHTML).toBe("");
  });

  function experienceRecord() {
    return {
      id: "e1",
      name: "Night Snorkel",
      slug: "night-snorkel",
      summary: "A night snorkel.",
      description: "Description.",
      seasonality: null,
      seasonSourceNote: null,
      seasonReviewedAt: null,
      suitability: null,
      durationGuidance: null,
      difficulty: null,
      safetyNotes: null,
      environmentalNotes: null,
      seoTitle: null,
      seoDescription: null,
      updatedAt: new Date(),
      category: { name: "Snorkelling", status: "PUBLISHED" },
    } as Awaited<ReturnType<typeof discoveryMod.getPublishedExperience>>;
  }

  async function renderExperience(links: MediaLinks): Promise<HTMLElement> {
    vi.spyOn(discoveryMod, "getPublishedExperience").mockResolvedValue(experienceRecord());
    vi.spyOn(discoveryMod, "listPublishedPlacesForExperience").mockResolvedValue({
      resorts: [],
      islands: [],
    });
    vi.spyOn(discoveryMod, "listRelatedGuides").mockResolvedValue([]);
    vi.spyOn(discoveryMod, "listOwnerFaqs").mockResolvedValue([]);
    vi.spyOn(analyticsMod, "notePublicView").mockResolvedValue(undefined);
    vi.spyOn(db.mediaLink, "findMany").mockResolvedValue(links);
    const view = await ExperiencePage({ params: Promise.resolve({ slug: "night-snorkel" }) });
    return render(view).container;
  }

  it("shows the experience hero from the canonical media link", async () => {
    const container = await renderExperience([
      link("e1", "HERO", "m-exp", "Snorkeller over a reef at night", "Lit by torchlight."),
    ]);
    expect(screen.getByAltText("Snorkeller over a reef at night")).toBeTruthy();
    expect(container.querySelector("figcaption")?.textContent).toBe("Lit by torchlight.");
  });

  it("renders an experience without media gracefully", async () => {
    const container = await renderExperience([]);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("figure")).toBeNull();
    expect(container.textContent).toContain("Night Snorkel");
  });

  function guideRecord() {
    return {
      id: "g1",
      title: "A Real Guide",
      slug: "a-real-guide",
      excerpt: "A real excerpt.",
      bodyPlain: "Body text.",
      seoTitle: null,
      seoDescription: null,
      canonicalPath: "",
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date(),
      staleAfter: null,
      author: { name: "Editor", status: "PUBLISHED" },
      category: { name: "Planning" },
      ogMedia: null,
      tags: [],
    } as Awaited<ReturnType<typeof discoveryMod.getPublishedGuide>>;
  }

  async function renderGuide(links: MediaLinks): Promise<HTMLElement> {
    vi.spyOn(discoveryMod, "getPublishedGuide").mockResolvedValue(guideRecord());
    vi.spyOn(discoveryMod, "listArticleRelations").mockResolvedValue([]);
    vi.spyOn(discoveryMod, "listOwnerFaqs").mockResolvedValue([]);
    vi.spyOn(analyticsMod, "notePublicView").mockResolvedValue(undefined);
    vi.spyOn(db.mediaLink, "findMany").mockResolvedValue(links);
    const view = await GuidePage({ params: Promise.resolve({ slug: "a-real-guide" }) });
    return render(view).container;
  }

  it("shows the guide hero and falls back to no image when none is linked", async () => {
    const withMedia = await renderGuide([
      link("g1", "HERO", "m-guide", "Aerial view of an atoll", null),
    ]);
    expect(screen.getByAltText("Aerial view of an atoll")).toBeTruthy();
    expect(withMedia.querySelector("figcaption")).toBeNull();
    cleanup();
    const without = await renderGuide([]);
    expect(without.querySelector("img")).toBeNull();
    expect(without.textContent).toContain("A Real Guide");
  });

  it("does not let a media failure take the detail page down", async () => {
    vi.spyOn(discoveryMod, "getPublishedGuide").mockResolvedValue(guideRecord());
    vi.spyOn(discoveryMod, "listArticleRelations").mockResolvedValue([]);
    vi.spyOn(discoveryMod, "listOwnerFaqs").mockResolvedValue([]);
    vi.spyOn(analyticsMod, "notePublicView").mockResolvedValue(undefined);
    vi.spyOn(db.mediaLink, "findMany").mockRejectedValue(new Error("media unavailable"));
    const view = await GuidePage({ params: Promise.resolve({ slug: "a-real-guide" }) });
    const { container } = render(view);
    expect(container.textContent).toContain("A Real Guide");
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("Phase 2 — newsletter editorial content", () => {
  async function renderNewsletter(
    guides: Array<{ id: string; title: string; slug: string; category: { name: string } | null }>,
  ) {
    vi.spyOn(db.article, "findMany").mockResolvedValue(guides as never);
    vi.spyOn(newsletterMod, "currentNoticeVersion").mockResolvedValue("2026-10-10");
    const view = await NewsletterPage({ searchParams: Promise.resolve({}) });
    return render(view).container;
  }

  it("lists real published guides with real titles and links only", async () => {
    const container = await renderNewsletter([
      {
        id: "g1",
        title: "How seaplane transfers work",
        slug: "seaplane-transfers",
        category: { name: "Transfers" },
      },
      { id: "g2", title: "Choosing an atoll", slug: "choosing-an-atoll", category: null },
    ]);
    const links = [...container.querySelectorAll("a")].filter((a) =>
      a.getAttribute("href")?.startsWith("/guides/"),
    );
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/guides/seaplane-transfers",
      "/guides/choosing-an-atoll",
    ]);
    expect(container.textContent).toContain("How seaplane transfers work");
    expect(container.textContent).toContain("Recent guides");
    expect(container.textContent).not.toMatch(/\d+ min read/);
  });

  it("drops the hardcoded dispatch cards and hides the section without articles", async () => {
    const container = await renderNewsletter([]);
    const text = container.textContent ?? "";
    expect(text).not.toContain("Recent guides");
    expect(text).not.toContain("Recent Gazette Dispatches");
    expect(text).not.toContain("Seaplane vs Speedboat");
    expect(text).not.toContain("Hanifaru Bay 2026");
    expect(text).not.toContain("Hidden Sandbanks of North Malé");
    expect(text).not.toMatch(/\d+ min read/);
  });

  it("selects articles through the same fixture-filtered query as /guides", async () => {
    const spy = vi.spyOn(db.article, "findMany").mockResolvedValue([]);
    vi.spyOn(newsletterMod, "currentNoticeVersion").mockResolvedValue("2026-10-10");
    await NewsletterPage({ searchParams: Promise.resolve({}) });
    expect(JSON.stringify(whereOf(spy))).toContain('"startsWith":"browser-"');
    expect(JSON.stringify(whereOf(spy))).toContain("PUBLISHED");
  });
});

describe("Phase 2 — OAuth availability (F-05 OAuth)", () => {
  const noop = async () => {};

  it("reports a provider only when both its id and secret are set", () => {
    expect(configuredOAuthProviders({})).toEqual([]);
    expect(configuredOAuthProviders({ AUTH_GOOGLE_ID: "id" })).toEqual([]);
    expect(configuredOAuthProviders({ AUTH_GOOGLE_SECRET: "secret" })).toEqual([]);
    expect(configuredOAuthProviders({ AUTH_GOOGLE_ID: " ", AUTH_GOOGLE_SECRET: "secret" })).toEqual(
      [],
    );
    expect(
      configuredOAuthProviders({ AUTH_GOOGLE_ID: "id", AUTH_GOOGLE_SECRET: "secret" }),
    ).toEqual(["google"]);
    expect(oauthCredentials("google", {})).toBeNull();
  });

  it("keeps Facebook unavailable because it cannot assert a verified email", () => {
    expect(
      configuredOAuthProviders({ AUTH_FACEBOOK_ID: "id", AUTH_FACEBOOK_SECRET: "secret" }),
    ).toEqual([]);
    expect(verifiedOAuthEmail("facebook", { email: "a@example.com", email_verified: true })).toBe(
      null,
    );
  });

  it("only trusts an email the provider verified", () => {
    expect(verifiedOAuthEmail("google", { email: " A@Example.com ", email_verified: true })).toBe(
      "a@example.com",
    );
    expect(
      verifiedOAuthEmail("google", { email: "a@example.com", email_verified: false }),
    ).toBeNull();
    expect(verifiedOAuthEmail("google", { email: "a@example.com" })).toBeNull();
    expect(verifiedOAuthEmail("google", undefined)).toBeNull();
  });

  it("renders nothing, not even the divider, when no provider is configured", () => {
    const { container } = render(<SocialOAuthButtons providers={[]} action={noop} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders a working form action for a configured provider", () => {
    const { container } = render(
      <SocialOAuthButtons providers={["google"]} action={noop} next="/account/saved" claim="c1" />,
    );
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeTruthy();
    expect(screen.queryByText(/Facebook/)).toBeNull();
    expect(container.querySelector('input[name="provider"]')?.getAttribute("value")).toBe("google");
    expect(container.querySelector('input[name="next"]')?.getAttribute("value")).toBe(
      "/account/saved",
    );
    expect(container.querySelector("form")).not.toBeNull();
  });

  it("keeps the login form free of social buttons and dead notices when unconfigured", () => {
    const { container } = render(
      <LoginForm
        registerHref="/register"
        oauthProviders={[]}
        oauthSignInAction={noop}
        passwordSignInAction={noop}
        requestMagicLinkAction={noop}
      />,
    );
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/Google|Facebook/);
    expect(text).not.toContain("being upgraded");
    expect(text).not.toContain("or sign in with email");
    expect(screen.getByRole("button", { name: /Sign In to Maldives Explorer/ })).toBeTruthy();
  });

  it("shows only the configured provider on the login form", () => {
    render(
      <LoginForm
        registerHref="/register"
        oauthProviders={["google"]}
        oauthSignInAction={noop}
        passwordSignInAction={noop}
        requestMagicLinkAction={noop}
      />,
    );
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeTruthy();
    expect(screen.queryByText(/Facebook/)).toBeNull();
  });

  it("does not offer social buttons on the registration page", async () => {
    vi.stubEnv("AUTH_GOOGLE_ID", "id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
    const view = await RegisterPage({ searchParams: Promise.resolve({}) });
    const { container } = render(view);
    expect(container.textContent).not.toMatch(/Continue with|Google|Facebook/);
  });

  it("passes only provider ids from the login page to the client", async () => {
    vi.stubEnv("AUTH_GOOGLE_ID", "client-id-value");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "client-secret-value");
    const view = await LoginPage({ searchParams: Promise.resolve({}) });
    const { container } = render(view);
    expect(screen.getByRole("button", { name: /Continue with Google/ })).toBeTruthy();
    expect(container.innerHTML).not.toContain("client-id-value");
    expect(container.innerHTML).not.toContain("client-secret-value");
  });

  it("rejects unconfigured or unknown providers in the sign-in action", async () => {
    const authMod = await import("@/auth");
    const form = (provider: string) => {
      const data = new FormData();
      data.set("provider", provider);
      return data;
    };
    await expect(oauthSignIn(form("google"))).rejects.toMatchObject({
      digest: expect.stringContaining("/login?error=oauth"),
    });
    await expect(oauthSignIn(form("facebook"))).rejects.toMatchObject({
      digest: expect.stringContaining("/login?error=oauth"),
    });
    expect(authMod.signIn).not.toHaveBeenCalled();
  });

  it("starts Auth.js sign-in for a configured provider with a safe destination", async () => {
    vi.stubEnv("AUTH_GOOGLE_ID", "id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "secret");
    const authMod = await import("@/auth");
    const data = new FormData();
    data.set("provider", "google");
    data.set("next", "https://evil.example/steal");
    await oauthSignIn(data);
    expect(authMod.signIn).toHaveBeenCalledWith("google", { redirectTo: "/" });
  });

  it("does not render the traveller quick-fill even when the UAT bar is open", () => {
    render(
      <LoginForm
        registerHref="/register"
        uatCredentials={{ email: "admin@local.test", password: "from-env" }}
        passwordSignInAction={noop}
        requestMagicLinkAction={noop}
      />,
    );
    expect(screen.getByText("admin@local.test")).toBeTruthy();
    expect(screen.queryByText(/Traveler Guest/)).toBeNull();
    expect(document.body.textContent).not.toContain("traveler@...");
  });
});

describe("Phase 2 — UAT quick fill gate", () => {
  const seeded = { SEED_ADMIN_EMAIL: "admin@local.test", SEED_ADMIN_PASSWORD: "from-env" };

  it("is closed unless explicitly enabled", () => {
    expect(uatQuickFill({ ...seeded })).toBeNull();
    expect(uatQuickFill({ ...seeded, ENABLE_UAT_QUICK_FILL: "1" })).toBeNull();
  });

  it("opens only when APP_ENV is exactly local, with the flag and seeded credentials", () => {
    expect(uatQuickFill({ ...seeded, ENABLE_UAT_QUICK_FILL: "true", APP_ENV: "local" })).toEqual({
      email: "admin@local.test",
      password: "from-env",
    });
  });

  it("stays closed when APP_ENV is missing or empty", () => {
    expect(uatQuickFill({ ...seeded, ENABLE_UAT_QUICK_FILL: "true" })).toBeNull();
    expect(
      uatQuickFill({ ...seeded, ENABLE_UAT_QUICK_FILL: "true", APP_ENV: undefined }),
    ).toBeNull();
    expect(uatQuickFill({ ...seeded, ENABLE_UAT_QUICK_FILL: "true", APP_ENV: "" })).toBeNull();
  });

  it("can never open in production, staging, preview, or an unrecognised environment", () => {
    for (const appEnv of [
      "production",
      "staging",
      "preview",
      "random",
      "bogus",
      "Local",
      " local",
    ]) {
      expect(
        uatQuickFill({ ...seeded, ENABLE_UAT_QUICK_FILL: "true", APP_ENV: appEnv }),
        appEnv,
      ).toBeNull();
    }
  });

  it("has no default password and needs both seeded values", () => {
    expect(uatQuickFill({ ENABLE_UAT_QUICK_FILL: "true" })).toBeNull();
    expect(
      uatQuickFill({ ENABLE_UAT_QUICK_FILL: "true", SEED_ADMIN_EMAIL: "admin@local.test" }),
    ).toBeNull();
  });

  it("keeps credential literals out of the login source", () => {
    const form = readFileSync(
      path.join(process.cwd(), "src", "app", "login", "login-form.tsx"),
      "utf8",
    );
    expect(form).not.toContain("AdminPassword123!");
    expect(form).not.toContain("Traveler123!");
    expect(form).not.toContain('traveler@example.com", "');
  });

  it("only opens the bar on the login page when the query flag and the gate agree", async () => {
    vi.stubEnv("ENABLE_UAT_QUICK_FILL", "true");
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("SEED_ADMIN_EMAIL", "admin@local.test");
    vi.stubEnv("SEED_ADMIN_PASSWORD", "from-env");
    const closed = render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(closed.container.textContent).not.toContain("Quick UAT Fill");
    closed.unmount();
    const open = render(await LoginPage({ searchParams: Promise.resolve({ uat: "1" }) }));
    expect(open.container.textContent).toContain("Quick UAT Fill");
    open.unmount();
    // APP_ENV missing: ENABLE_UAT_QUICK_FILL=true plus ?uat=1 must not open the bar.
    vi.stubEnv("APP_ENV", undefined);
    const missing = render(await LoginPage({ searchParams: Promise.resolve({ uat: "1" }) }));
    expect(missing.container.textContent).not.toContain("Quick UAT Fill");
    missing.unmount();
    vi.stubEnv("APP_ENV", "");
    const empty = render(await LoginPage({ searchParams: Promise.resolve({ uat: "1" }) }));
    expect(empty.container.textContent).not.toContain("Quick UAT Fill");
    empty.unmount();
    vi.stubEnv("APP_ENV", "production");
    const production = render(await LoginPage({ searchParams: Promise.resolve({ uat: "1" }) }));
    expect(production.container.textContent).not.toContain("Quick UAT Fill");
  });
});
