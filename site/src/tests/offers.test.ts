import { describe, expect, it } from "vitest";
import { offerIsCurrent, offerLines, utcToday } from "@/modules/offers/rules";

describe("offer publication rules", () => {
  it("keeps an offer current only inside its validity dates", () => {
    const today = utcToday();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    expect(offerIsCurrent(yesterday, tomorrow, today)).toBe(true);
    expect(offerIsCurrent(yesterday, yesterday, today)).toBe(false);
    expect(offerIsCurrent(tomorrow, tomorrow, today)).toBe(false);
  });

  it("keeps only non-empty inclusion lines", () => {
    expect(offerLines("Speedboat\n\nBreakfast")).toEqual(["Speedboat", "Breakfast"]);
  });
});
