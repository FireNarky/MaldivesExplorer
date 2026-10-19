import { z } from "zod";
import { slugSchema } from "@/modules/publishing/schemas";

const text = z.string().trim().min(1, "Enter the required text.");
const blank = z.string().trim().optional();
const flag = z.enum(["", "true", "false"]).optional();

export const resortInput = z
  .object({
    islandId: z.string().uuid("Choose an island."),
    name: text,
    slug: slugSchema,
    propertyType: z.enum(["RESORT", "GUESTHOUSE", "LIVEABOARD"]),
    summary: text,
    description: text,
    editorialPositioning: blank,
    priceBandId: z.string().trim().optional(),
    seoTitle: blank,
    seoDescription: blank,
    indicativeFromPrice: blank,
    indicativeCurrency: blank,
    priceBasis: blank,
    priceIncludesTransfer: flag,
    priceIncludesTax: flag,
    priceSourceNote: blank,
    priceReviewedAt: blank,
    hasHouseReef: flag,
    reefSummary: blank,
    diveCenterSummary: blank,
    reefSourceNote: blank,
    reefReviewedAt: blank,
    starCategory: blank,
    starCategorySource: blank,
    checkInNotes: blank,
  })
  .superRefine((input, context) => {
    const priceStarted = Boolean(
      input.indicativeFromPrice || input.indicativeCurrency || input.priceBasis,
    );
    if (priceStarted) {
      if (!input.indicativeFromPrice || Number(input.indicativeFromPrice) < 0) {
        context.addIssue({
          code: "custom",
          message: "Enter an indicative price of zero or more.",
          path: ["indicativeFromPrice"],
        });
      }
      if (!input.indicativeCurrency || !/^[A-Z]{3}$/.test(input.indicativeCurrency)) {
        context.addIssue({
          code: "custom",
          message: "Enter a three-letter currency.",
          path: ["indicativeCurrency"],
        });
      }
      if (!input.priceBasis || !input.priceSourceNote || !input.priceReviewedAt) {
        context.addIssue({
          code: "custom",
          message: "Price needs a basis, source note, and review time.",
          path: ["priceBasis"],
        });
      }
      if (!input.priceIncludesTransfer || !input.priceIncludesTax) {
        context.addIssue({
          code: "custom",
          message: "Say whether the price includes transfer and tax.",
          path: ["priceIncludesTransfer"],
        });
      }
    }
    if (input.hasHouseReef === "true" || input.hasHouseReef === "false") {
      if (!input.reefSourceNote || !input.reefReviewedAt) {
        context.addIssue({
          code: "custom",
          message: "Reef details need a source note and review time.",
          path: ["reefSourceNote"],
        });
      }
    }
    if (input.starCategory && !input.starCategorySource) {
      context.addIssue({
        code: "custom",
        message: "Enter the star-category source.",
        path: ["starCategorySource"],
      });
    }
  });

export const roomInput = z.object({
  resortId: z.string().uuid("Choose a resort."),
  categoryId: z.string().uuid("Choose a room category."),
  name: text,
  slug: slugSchema,
  description: text,
  maxAdults: z.coerce.number().int().min(1, "Enter at least one adult."),
  maxChildren: z.coerce.number().int().min(0),
});

export const diningInput = z.object({
  resortId: z.string().uuid("Choose a resort."),
  venueTypeId: z.string().uuid("Choose a venue type."),
  name: text,
  description: text,
  cuisine: blank,
});

export const transferInput = z
  .object({
    resortId: z.string().uuid("Choose a resort."),
    transferTypeId: z.string().uuid("Choose a transfer type."),
    label: text,
    durationMinutes: blank,
    sourceNote: blank,
    notes: blank,
  })
  .superRefine((input, context) => {
    if (input.durationMinutes && !input.sourceNote) {
      context.addIssue({
        code: "custom",
        message: "A duration needs a source note.",
        path: ["sourceNote"],
      });
    }
  });

export const amenityInput = z.object({
  code: slugSchema,
  name: text,
  category: text,
  description: blank,
});

export const audienceInput = z.object({
  code: slugSchema,
  name: text,
});

export type ResortInput = z.infer<typeof resortInput>;
export type RoomInput = z.infer<typeof roomInput>;
export type DiningInput = z.infer<typeof diningInput>;
export type TransferInput = z.infer<typeof transferInput>;
export type AmenityInput = z.infer<typeof amenityInput>;
export type AudienceInput = z.infer<typeof audienceInput>;
