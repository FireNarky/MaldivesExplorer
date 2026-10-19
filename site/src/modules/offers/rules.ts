import { z } from "zod";
import { slugSchema } from "@/modules/publishing/schemas";

const line = z.string().trim().min(1).max(200);

export const offerInput = z.object({
  resortId: z.string().uuid("Choose a resort."),
  roomTypeId: z.string().trim().optional(),
  title: z.string().trim().min(1, "Enter a title.").max(160),
  slug: slugSchema,
  summary: z.string().trim().min(1, "Enter a summary.").max(500),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, "Enter a 3-letter currency code."),
  fromPrice: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter the staff price with up to two decimal places."),
  occupancyBasisId: z.string().uuid("Choose an occupancy basis."),
  mealPlanId: z.string().uuid("Choose a meal plan."),
  transferIncluded: z.enum(["true", "false"]),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid-from date."),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid-until date."),
  stayFrom: z.string().trim().optional(),
  stayUntil: z.string().trim().optional(),
  minNights: z.string().trim().optional(),
  terms: z.string().trim().min(1, "Enter the terms.").max(4000),
  inclusions: z.string().trim().optional(),
  exclusions: z.string().trim().optional(),
  seoTitle: z.string().trim().max(160).optional(),
  seoDescription: z.string().trim().max(300).optional(),
});

export type OfferInput = z.infer<typeof offerInput>;

export function offerLines(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 20)
    .map((item) => line.parse(item));
}

export function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function parseDateOnly(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function offerIsCurrent(validFrom: Date, validUntil: Date, today = utcToday()): boolean {
  return validFrom.getTime() <= today.getTime() && validUntil.getTime() >= today.getTime();
}
