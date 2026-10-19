import { db } from "@/lib/db";

export function listContentCategories() {
  return db.contentCategory.findMany({ orderBy: { name: "asc" } });
}

export function getContentCategory(id: string) {
  return db.contentCategory.findUnique({ where: { id } });
}

export function listTags() {
  return db.tag.findMany({ orderBy: { name: "asc" } });
}

export function getTag(id: string) {
  return db.tag.findUnique({ where: { id } });
}

export function listExperts() {
  return db.expertProfile.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, status: true },
  });
}

export function getExpert(id: string) {
  return db.expertProfile.findUnique({ where: { id } });
}

export function listArticles() {
  return db.article.findMany({
    orderBy: { title: "asc" },
    select: { id: true, title: true, slug: true, status: true },
  });
}

export function getArticle(id: string) {
  return db.article.findUnique({ where: { id } });
}

export function listFaqs() {
  return db.faq.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, question: true, status: true, ownerType: true },
  });
}

export function getFaq(id: string) {
  return db.faq.findUnique({ where: { id } });
}

export function listCollections() {
  return db.collection.findMany({
    orderBy: { title: "asc" },
    select: { id: true, title: true, slug: true, status: true },
  });
}

export function getCollection(id: string) {
  return db.collection.findUnique({ where: { id } });
}

export function listHomepageModules() {
  return db.homepageModule.findMany({ orderBy: { sortOrder: "asc" } });
}

export function getHomepageModule(id: string) {
  return db.homepageModule.findUnique({ where: { id } });
}

export function listPublishedHomepageModules(now = new Date()) {
  return db.homepageModule.findMany({
    where: {
      status: "PUBLISHED",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { sortOrder: "asc" },
  });
}

export function listBlocks() {
  return db.reusableBlock.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, blockType: true, status: true },
  });
}

export function getBlock(id: string) {
  return db.reusableBlock.findUnique({ where: { id } });
}
