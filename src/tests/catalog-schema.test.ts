import { describe, expect, it } from "vitest";
import { resortInput } from "@/modules/catalog/schemas";
import { homepageInput } from "@/modules/content/schemas";

const resort = {
  islandId: "11111111-1111-4111-8111-111111111111",
  name: "Exercise resort",
  slug: "exercise-resort",
  propertyType: "RESORT" as const,
  summary: "Exercise property.",
  description: "Exercise property.",
};

describe("catalog validation", () => {
  it("rejects an indicative price that is missing its source fields", () => {
    const parsed = resortInput.safeParse({
      ...resort,
      indicativeFromPrice: "100",
      indicativeCurrency: "USD",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a complete indicative price", () => {
    const parsed = resortInput.safeParse({
      ...resort,
      indicativeFromPrice: "100",
      indicativeCurrency: "USD",
      priceBasis: "per room",
      priceIncludesTransfer: "false",
      priceIncludesTax: "true",
      priceSourceNote: "Operator sheet",
      priceReviewedAt: "2026-10-01T00:00",
    });
    expect(parsed.success).toBe(true);
  });

  it("allows an empty homepage module", () => {
    const parsed = homepageInput.parse({ moduleType: "FEATURED_OFFERS", sortOrder: "0" });
    expect(parsed.text).toBeUndefined();
  });
});
