import { db } from "@/lib/db";
import {
  attributeValue,
  compareAttributes,
  type CompareColumn,
  type ResortFacts,
} from "@/modules/compare/attributes";
import { isHiddenFixtureSlug } from "@/modules/discovery/visibility";
import { compareLimit, isUuid } from "@/modules/wishlist/rules";

export async function loadCompareColumns(ids: string[]): Promise<CompareColumn[]> {
  const unique = ids
    .filter((id, index) => isUuid(id) && ids.indexOf(id) === index)
    .slice(0, compareLimit);
  const rows = await db.resort.findMany({
    where: { id: { in: unique } },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      editorialPositioning: true,
      hasHouseReef: true,
      priceBand: { select: { label: true } },
      island: {
        select: {
          name: true,
          status: true,
          atoll: { select: { name: true, status: true } },
        },
      },
      transfers: {
        orderBy: { sortOrder: "asc" },
        select: {
          durationMinutes: true,
          transferType: { select: { label: true } },
        },
      },
      diningVenues: {
        where: { status: "PUBLISHED" },
        select: { mealPlans: { select: { mealPlan: { select: { label: true } } } } },
      },
      roomTypes: {
        where: { status: "PUBLISHED" },
        select: { category: { select: { label: true } } },
      },
      audiences: { select: { audienceTag: { select: { name: true } } } },
    },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return unique.map((id) => {
    const row = byId.get(id);
    if (!row || row.status !== "PUBLISHED" || isHiddenFixtureSlug(row.slug)) {
      return { id, name: "Unavailable", href: null, available: false, facts: null };
    }
    const facts: ResortFacts = {
      islandName: row.island.status === "PUBLISHED" ? row.island.name : null,
      atollName:
        row.island.status === "PUBLISHED" && row.island.atoll.status === "PUBLISHED"
          ? row.island.atoll.name
          : null,
      transfers: row.transfers.map((transfer) => ({
        typeLabel: transfer.transferType.label,
        minutes: transfer.durationMinutes,
      })),
      priceBand: row.priceBand?.label ?? null,
      mealPlans: row.diningVenues.flatMap((venue) =>
        venue.mealPlans.map((item) => item.mealPlan.label),
      ),
      villaTypes: row.roomTypes.map((room) => room.category.label),
      audiences: row.audiences.map((item) => item.audienceTag.name),
      houseReef: row.hasHouseReef,
      positioning: row.editorialPositioning,
    };
    return {
      id: row.id,
      name: row.name,
      href: `/resorts/${row.slug}`,
      available: true,
      facts,
    };
  });
}

export function compareTable(columns: CompareColumn[]) {
  return compareAttributes.map((attribute) => ({
    attribute,
    values: columns.map((column) => attributeValue(attribute, column)),
  }));
}
