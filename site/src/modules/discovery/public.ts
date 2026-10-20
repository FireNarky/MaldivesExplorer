import type { ContentEntityType, FaqOwnerType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { listOfferSitemap } from "@/modules/offers/service";
import type { PublicFaq, PublicLink, SitemapEntry } from "@/modules/discovery/types";

function coordinate(value: Prisma.Decimal | null): string | null {
  return value ? value.toString() : null;
}

function link(id: string, name: string, href: string, summary: string): PublicLink {
  return { id, name, href, summary };
}

const published = {
  status: "PUBLISHED" as const,
  NOT: { slug: { startsWith: "browser-" } },
};

export async function listPublishedAtolls(): Promise<PublicLink[]> {
  const rows = await db.atoll.findMany({
    where: published,
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, summary: true },
  });
  return rows.map((row) => link(row.id, row.name, `/atolls/${row.slug}`, row.summary));
}

export async function getPublishedAtoll(slug: string) {
  const row = await db.atoll.findFirst({
    where: { slug, ...published },
    select: {
      id: true,
      name: true,
      slug: true,
      summary: true,
      description: true,
      latitude: true,
      longitude: true,
      seoTitle: true,
      seoDescription: true,
      updatedAt: true,
    },
  });
  if (!row) return null;
  return { ...row, latitude: coordinate(row.latitude), longitude: coordinate(row.longitude) };
}

export async function listPublishedIslandsForAtoll(atollId: string): Promise<PublicLink[]> {
  const rows = await db.island.findMany({
    where: { atollId, ...published },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, summary: true },
  });
  return rows.map((row) => link(row.id, row.name, `/islands/${row.slug}`, row.summary));
}

export async function getPublishedIsland(slug: string) {
  const row = await db.island.findFirst({
    where: { slug, ...published },
    select: {
      id: true,
      name: true,
      slug: true,
      summary: true,
      description: true,
      history: true,
      cultureNotes: true,
      etiquette: true,
      islandType: true,
      latitude: true,
      longitude: true,
      seoTitle: true,
      seoDescription: true,
      updatedAt: true,
      atoll: { select: { id: true, name: true, slug: true, status: true } },
    },
  });
  if (!row) return null;
  return { ...row, latitude: coordinate(row.latitude), longitude: coordinate(row.longitude) };
}

export async function listPublishedResortsForIsland(islandId: string): Promise<PublicLink[]> {
  const rows = await db.resort.findMany({
    where: { islandId, ...published },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, summary: true },
  });
  return rows.map((row) => link(row.id, row.name, `/resorts/${row.slug}`, row.summary));
}

export async function listPublishedResortsForAtoll(atollId: string): Promise<PublicLink[]> {
  const rows = await db.resort.findMany({
    where: { ...published, island: { atollId, status: "PUBLISHED" } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, summary: true },
  });
  return rows.map((row) => link(row.id, row.name, `/resorts/${row.slug}`, row.summary));
}

export async function listPublishedExperiences(): Promise<PublicLink[]> {
  const rows = await db.experience.findMany({
    where: published,
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, summary: true },
  });
  return rows.map((row) => link(row.id, row.name, `/experiences/${row.slug}`, row.summary));
}

export async function getPublishedExperience(slug: string) {
  return db.experience.findFirst({
    where: { slug, ...published },
    select: {
      id: true,
      name: true,
      slug: true,
      summary: true,
      description: true,
      seasonality: true,
      seasonSourceNote: true,
      seasonReviewedAt: true,
      suitability: true,
      durationGuidance: true,
      difficulty: true,
      safetyNotes: true,
      environmentalNotes: true,
      seoTitle: true,
      seoDescription: true,
      updatedAt: true,
      category: { select: { name: true, status: true } },
    },
  });
}

export async function listPublishedExperiencesForIsland(islandId: string): Promise<PublicLink[]> {
  const rows = await db.experience.findMany({
    where: { status: "PUBLISHED", islands: { some: { islandId } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, summary: true },
  });
  return rows.map((row) => link(row.id, row.name, `/experiences/${row.slug}`, row.summary));
}

export async function listPublishedExperiencesForAtoll(atollId: string): Promise<PublicLink[]> {
  const rows = await db.experience.findMany({
    where: {
      status: "PUBLISHED",
      islands: { some: { island: { atollId, status: "PUBLISHED" } } },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, summary: true },
  });
  return rows.map((row) => link(row.id, row.name, `/experiences/${row.slug}`, row.summary));
}

export async function listPublishedExperiencesForResort(resortId: string): Promise<PublicLink[]> {
  const rows = await db.experience.findMany({
    where: { status: "PUBLISHED", resorts: { some: { resortId } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, summary: true },
  });
  return rows.map((row) => link(row.id, row.name, `/experiences/${row.slug}`, row.summary));
}

export async function listPublishedPlacesForExperience(experienceId: string): Promise<{
  resorts: PublicLink[];
  islands: PublicLink[];
}> {
  const [resorts, islands] = await Promise.all([
    db.resort.findMany({
      where: { status: "PUBLISHED", experiences: { some: { experienceId } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, summary: true },
    }),
    db.island.findMany({
      where: { status: "PUBLISHED", experiences: { some: { experienceId } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, summary: true },
    }),
  ]);
  return {
    resorts: resorts.map((row) => link(row.id, row.name, `/resorts/${row.slug}`, row.summary)),
    islands: islands.map((row) => link(row.id, row.name, `/islands/${row.slug}`, row.summary)),
  };
}

export async function listPublishedGuides(): Promise<PublicLink[]> {
  const rows = await db.article.findMany({
    where: published,
    orderBy: { title: "asc" },
    select: { id: true, title: true, slug: true, excerpt: true },
  });
  return rows.map((row) => link(row.id, row.title, `/guides/${row.slug}`, row.excerpt));
}

const guideSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  bodyPlain: true,
  seoTitle: true,
  seoDescription: true,
  canonicalPath: true,
  publishedAt: true,
  updatedAt: true,
  staleAfter: true,
  author: { select: { name: true, status: true } },
  category: { select: { name: true } },
  ogMedia: { select: { id: true, status: true, altText: true } },
  tags: { select: { tag: { select: { name: true } } } },
} as const;

export async function getPublishedGuide(slug: string) {
  const english = await db.article.findFirst({
    where: { slug, locale: "en", ...published },
    select: guideSelect,
  });
  if (english) return english;
  return db.article.findFirst({ where: { slug, ...published }, select: guideSelect });
}

export async function listPublishedCollections(): Promise<PublicLink[]> {
  const rows = await db.collection.findMany({
    where: published,
    orderBy: { title: "asc" },
    select: { id: true, title: true, slug: true, summary: true },
  });
  return rows.map((row) => link(row.id, row.title, `/collections/${row.slug}`, row.summary));
}

export async function getPublishedCollection(slug: string) {
  const english = await db.collection.findFirst({
    where: { slug, locale: "en", ...published },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      body: true,
      seoTitle: true,
      seoDescription: true,
      updatedAt: true,
    },
  });
  if (english) return english;
  return db.collection.findFirst({
    where: { slug, ...published },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      body: true,
      seoTitle: true,
      seoDescription: true,
      updatedAt: true,
    },
  });
}

export async function listPublishedCollectionItems(collectionId: string): Promise<PublicLink[]> {
  const items = await db.collectionItem.findMany({
    where: { collectionId },
    orderBy: { sortOrder: "asc" },
    select: { entityType: true, entityId: true },
  });
  const links: PublicLink[] = [];
  for (const item of items) {
    const target = await publishedTarget(item.entityType, item.entityId);
    if (target) links.push(target);
  }
  return links;
}

export async function listOwnerFaqs(
  ownerType: FaqOwnerType,
  ownerId: string,
): Promise<PublicFaq[]> {
  return db.faq.findMany({
    where: { ownerType, ownerId, status: "PUBLISHED" },
    orderBy: [{ sortOrder: "asc" }, { question: "asc" }],
    select: { id: true, question: true, answer: true },
  });
}

export async function listGlobalFaqs(): Promise<PublicFaq[]> {
  return db.faq.findMany({
    where: { ownerType: "GLOBAL", ownerId: null, status: "PUBLISHED" },
    orderBy: [{ sortOrder: "asc" }, { question: "asc" }],
    select: { id: true, question: true, answer: true },
  });
}

export async function listRelatedGuides(
  entityType: ContentEntityType,
  entityId: string,
): Promise<PublicLink[]> {
  const rows = await db.contentRelation.findMany({
    where: { entityType, entityId, article: published },
    orderBy: { sortOrder: "asc" },
    select: { article: { select: { id: true, title: true, slug: true, excerpt: true } } },
  });
  return rows.map((row) =>
    link(row.article.id, row.article.title, `/guides/${row.article.slug}`, row.article.excerpt),
  );
}

export async function listArticleRelations(articleId: string): Promise<PublicLink[]> {
  const rows = await db.contentRelation.findMany({
    where: { articleId },
    orderBy: { sortOrder: "asc" },
    select: { entityType: true, entityId: true },
  });
  const links: PublicLink[] = [];
  for (const row of rows) {
    if (row.entityType === "OFFER") continue;
    const target = await publishedTarget(row.entityType, row.entityId);
    if (target) links.push(target);
  }
  return links;
}

async function publishedTarget(
  entityType: ContentEntityType,
  entityId: string,
): Promise<PublicLink | null> {
  if (entityType === "RESORT") {
    const row = await db.resort.findFirst({
      where: { id: entityId, ...published },
      select: { id: true, name: true, slug: true, summary: true },
    });
    return row ? link(row.id, row.name, `/resorts/${row.slug}`, row.summary) : null;
  }
  if (entityType === "EXPERIENCE") {
    const row = await db.experience.findFirst({
      where: { id: entityId, ...published },
      select: { id: true, name: true, slug: true, summary: true },
    });
    return row ? link(row.id, row.name, `/experiences/${row.slug}`, row.summary) : null;
  }
  if (entityType === "ARTICLE") {
    const row = await db.article.findFirst({
      where: { id: entityId, ...published },
      select: { id: true, title: true, slug: true, excerpt: true },
    });
    return row ? link(row.id, row.title, `/guides/${row.slug}`, row.excerpt) : null;
  }
  if (entityType === "ISLAND") {
    const row = await db.island.findFirst({
      where: { id: entityId, ...published },
      select: { id: true, name: true, slug: true, summary: true },
    });
    return row ? link(row.id, row.name, `/islands/${row.slug}`, row.summary) : null;
  }
  if (entityType === "ATOLL") {
    const row = await db.atoll.findFirst({
      where: { id: entityId, ...published },
      select: { id: true, name: true, slug: true, summary: true },
    });
    return row ? link(row.id, row.name, `/atolls/${row.slug}`, row.summary) : null;
  }
  return null;
}

export function collectionBodyText(body: unknown): string {
  if (!body || typeof body !== "object" || Array.isArray(body) || !("text" in body)) return "";
  return typeof body.text === "string" ? body.text : "";
}

export async function listSitemapEntries(): Promise<SitemapEntry[]> {
  const now = new Date();
  const staticEntries: SitemapEntry[] = [
    "/",
    "/destinations",
    "/resorts",
    "/offers",
    "/experiences",
    "/guides",
    "/collections",
    "/faq",
    "/search",
    "/wishlist",
    "/compare",
    "/recently-viewed",
    "/plan",
  ].map((path) => ({ path, updatedAt: now }));
  const [atolls, islands, resorts, offers, experiences, guides, collections] = await Promise.all([
    db.atoll.findMany({ where: published, select: { slug: true, updatedAt: true } }),
    db.island.findMany({ where: published, select: { slug: true, updatedAt: true } }),
    db.resort.findMany({ where: published, select: { slug: true, updatedAt: true } }),
    listOfferSitemap(),
    db.experience.findMany({ where: published, select: { slug: true, updatedAt: true } }),
    db.article.findMany({ where: published, select: { slug: true, updatedAt: true } }),
    db.collection.findMany({ where: published, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    ...staticEntries,
    ...atolls.map((row) => ({ path: `/atolls/${row.slug}`, updatedAt: row.updatedAt })),
    ...islands.map((row) => ({ path: `/islands/${row.slug}`, updatedAt: row.updatedAt })),
    ...resorts.map((row) => ({ path: `/resorts/${row.slug}`, updatedAt: row.updatedAt })),
    ...offers.map((row) => ({ path: `/offers/${row.slug}`, updatedAt: row.updatedAt })),
    ...experiences.map((row) => ({
      path: `/experiences/${row.slug}`,
      updatedAt: row.updatedAt,
    })),
    ...guides.map((row) => ({ path: `/guides/${row.slug}`, updatedAt: row.updatedAt })),
    ...collections.map((row) => ({
      path: `/collections/${row.slug}`,
      updatedAt: row.updatedAt,
    })),
  ];
}
