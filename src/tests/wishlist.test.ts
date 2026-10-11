import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { attributeValue, type CompareColumn } from "@/modules/compare/attributes";
import {
  addCompareId,
  addWishlistItem,
  anonymousWishlistLimit,
  canReadSavedItem,
  canWriteSavedItem,
  combineNotes,
  mergeWishlists,
  rememberView,
  type WishlistDraft,
} from "@/modules/wishlist/rules";

const resort = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";

function draft(
  entityId: string,
  note: string,
  savedAt: string,
  entityType: WishlistDraft["entityType"] = "RESORT",
): WishlistDraft {
  return { entityType, entityId, note, savedAt };
}

const facts = {
  islandName: null,
  atollName: null,
  transfers: [],
  priceBand: null,
  mealPlans: [],
  villaTypes: [],
  audiences: [],
  houseReef: null,
  positioning: null,
};

describe("saved list rules", () => {
  it("merges by entity, keeps the earlier time, and preserves both notes", () => {
    const merged = mergeWishlists(
      [draft(resort, "Account note", "2026-02-01T00:00:00.000Z")],
      [draft(resort, "Device note", "2026-01-01T00:00:00.000Z")],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.entityType).toBe("RESORT");
    expect(merged[0]?.savedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(merged[0]?.note).toBe("Account note\nDevice note");
  });

  it("collapses a repeated save and stops the anonymous list at 50", () => {
    const first = draft(resort, "", "2026-01-01T00:00:00.000Z");
    const repeat = addWishlistItem([first], first);
    expect(repeat.items).toHaveLength(1);
    expect(repeat.error).toBeUndefined();
    const full = Array.from({ length: anonymousWishlistLimit }, (_, index) =>
      draft(
        `33333333-3333-4333-8333-${String(index).padStart(12, "0")}`,
        "",
        "2026-01-01T00:00:00.000Z",
      ),
    );
    const blocked = addWishlistItem(full, draft(other, "", "2026-01-02T00:00:00.000Z"));
    expect(blocked.items).toHaveLength(50);
    expect(blocked.error).toBe("The saved list on this device holds 50 items.");
  });

  it("caps compare at 3 and drops the oldest recent view", () => {
    const third = addCompareId([resort, other, "33333333-3333-4333-8333-333333333333"], resort);
    expect(third.ids).toHaveLength(3);
    const fourth = addCompareId(third.ids, "44444444-4444-4444-8444-444444444444");
    expect(fourth.error).toBe("Compare holds 3 resorts.");
    expect(fourth.ids).toHaveLength(3);
    const recent = rememberView(
      [
        { entityType: "ATOLL", entityId: resort, viewedAt: "2026-01-01T00:00:00.000Z" },
        { entityType: "ISLAND", entityId: other, viewedAt: "2026-01-02T00:00:00.000Z" },
      ],
      { entityType: "COLLECTION", entityId: resort, viewedAt: "2026-01-03T00:00:00.000Z" },
      2,
    );
    expect(recent.map((item) => item.entityType)).toEqual(["COLLECTION", "ATOLL"]);
  });

  it("allows the owner to change a saved item and a reader with customer.read to view it", () => {
    expect(canWriteSavedItem("owner", "owner")).toBe(true);
    expect(canWriteSavedItem("other", "owner")).toBe(false);
    expect(canWriteSavedItem("", "owner")).toBe(false);
    expect(canReadSavedItem("other", "owner", ["customer.read"])).toBe(true);
    expect(canReadSavedItem("other", "owner", [])).toBe(false);
    expect(combineNotes("Same", "Same")).toBe("Same");
  });

  it("prints Unknown for a missing fact and withholds the indicative price", () => {
    const column: CompareColumn = {
      id: resort,
      name: "Published resort",
      href: "/resorts/published",
      available: true,
      facts,
    };
    expect(attributeValue("Island", column)).toBe("Unknown");
    expect(attributeValue("House reef", column)).toBe("Unknown");
    expect(attributeValue("Indicative price", column)).toBe(
      "An indicative price is not published.",
    );
    const unavailable: CompareColumn = {
      id: other,
      name: "Unavailable",
      href: null,
      available: false,
      facts: null,
    };
    expect(attributeValue("Indicative price", unavailable)).toBe("Unknown");
    const source = readFileSync("src/modules/compare/service.ts", "utf8");
    expect(source.includes("indicativeFromPrice")).toBe(false);
  });
});
