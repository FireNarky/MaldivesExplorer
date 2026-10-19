import { z } from "zod";
import { slugSchema } from "@/modules/publishing/schemas";

const text = z.string().trim().min(1, "Enter the required text.");

export const atollInput = z.object({
  name: text,
  slug: slugSchema,
  summary: text,
  description: text,
  latitude: z.string().trim().optional(),
  longitude: z.string().trim().optional(),
  seoTitle: z.string().trim().optional(),
  seoDescription: z.string().trim().optional(),
});

export const islandInput = atollInput.extend({
  atollId: z.string().uuid("Choose an atoll."),
  islandType: z.enum(["RESORT", "LOCAL", "UNINHABITED"]),
  history: z.string().trim().optional(),
  cultureNotes: z.string().trim().optional(),
  etiquette: z.string().trim().optional(),
});

export type AtollInput = z.infer<typeof atollInput>;
export type IslandInput = z.infer<typeof islandInput>;

export function coordinatePair(
  latitude?: string,
  longitude?: string,
): { latitude?: string; longitude?: string } {
  const lat = latitude?.trim() ?? "";
  const lng = longitude?.trim() ?? "";
  if (lat.length === 0 && lng.length === 0) return {};
  if (lat.length === 0 || lng.length === 0) {
    throw new Error("Enter both latitude and longitude.");
  }
  const latitudeNumber = Number(lat);
  const longitudeNumber = Number(lng);
  if (
    latitudeNumber < -90 ||
    latitudeNumber > 90 ||
    longitudeNumber < -180 ||
    longitudeNumber > 180
  ) {
    throw new Error("Coordinates are out of range.");
  }
  return { latitude: lat, longitude: lng };
}
