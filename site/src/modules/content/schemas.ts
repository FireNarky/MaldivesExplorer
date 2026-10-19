import { z } from "zod";
import { slugSchema } from "@/modules/publishing/schemas";

const text = z.string().trim().min(1, "Enter the required text.");
const blank = z.string().trim().optional();

export const contentCategoryInput = z.object({
  name: text,
  slug: slugSchema,
  description: text,
  parentId: blank,
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const tagInput = z.object({
  name: text,
  slug: slugSchema,
});

export const expertInput = z.object({
  name: text,
  slug: slugSchema,
  title: text,
  bio: text,
});

export const articleInput = z.object({
  title: text,
  slug: slugSchema,
  excerpt: text,
  bodyText: text,
  categoryId: z.string().uuid("Choose a category."),
  authorId: z.string().uuid("Choose an author."),
  reviewerId: blank,
  reviewedAt: blank,
  seoTitle: blank,
  seoDescription: blank,
  locale: z
    .string()
    .trim()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Use a locale such as en.")
    .default("en"),
});

export const faqInput = z.object({
  ownerType: z.enum(["GLOBAL", "RESORT", "ISLAND", "ATOLL", "EXPERIENCE", "ARTICLE"]),
  ownerId: blank,
  question: text,
  answer: text,
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const collectionInput = z.object({
  title: text,
  slug: slugSchema,
  summary: text,
  bodyText: blank,
  seoTitle: blank,
  seoDescription: blank,
});

export const homepageInput = z.object({
  moduleType: z.enum([
    "HERO",
    "FEATURED_RESORTS",
    "FEATURED_OFFERS",
    "FEATURED_EXPERIENCES",
    "FEATURED_GUIDES",
    "DESTINATION_EXPLAINER",
    "TRUST",
    "TESTIMONIALS",
    "NEWSLETTER",
    "RECENTLY_VIEWED",
  ]),
  title: blank,
  text: blank,
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const blockInput = z.object({
  code: slugSchema,
  blockType: z.enum(["RICH_TEXT", "CALLOUT", "FAQ_LIST", "CTA", "RELATED_ENTITIES", "IMAGE_BAND"]),
  bodyText: text,
});

export type ContentCategoryInput = z.infer<typeof contentCategoryInput>;
export type TagInput = z.infer<typeof tagInput>;
export type ExpertInput = z.infer<typeof expertInput>;
export type ArticleInput = z.infer<typeof articleInput>;
export type FaqInput = z.infer<typeof faqInput>;
export type CollectionInput = z.infer<typeof collectionInput>;
export type HomepageInput = z.infer<typeof homepageInput>;
export type BlockInput = z.infer<typeof blockInput>;
