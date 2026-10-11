import { z } from "zod";
import { slugSchema } from "@/modules/publishing/schemas";

const text = z.string().trim().min(1, "Enter the required text.");
const blank = z.string().trim().optional();

export const experienceCategoryInput = z.object({
  name: text,
  slug: slugSchema,
  description: text,
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const experienceInput = z
  .object({
    categoryId: z.string().uuid("Choose a category."),
    name: text,
    slug: slugSchema,
    summary: text,
    description: text,
    seasonality: blank,
    seasonSourceNote: blank,
    seasonReviewedAt: blank,
    suitability: blank,
    durationGuidance: blank,
    difficulty: blank,
    safetyNotes: blank,
    environmentalNotes: blank,
    seoTitle: blank,
    seoDescription: blank,
  })
  .superRefine((input, context) => {
    if (input.seasonality && (!input.seasonSourceNote || !input.seasonReviewedAt)) {
      context.addIssue({
        code: "custom",
        message: "Seasonality needs a source note and review time.",
        path: ["seasonSourceNote"],
      });
    }
  });

export type ExperienceCategoryInput = z.infer<typeof experienceCategoryInput>;
export type ExperienceInput = z.infer<typeof experienceInput>;
