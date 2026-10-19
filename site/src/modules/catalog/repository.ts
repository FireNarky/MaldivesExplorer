import { db } from "@/lib/db";

const publishedResort = {
  status: "PUBLISHED" as const,
};

export function listResorts() {
  return db.resort.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, status: true },
  });
}

export function getResort(id: string) {
  return db.resort.findUnique({ where: { id } });
}

export function listPublishedResorts() {
  return db.resort.findMany({
    where: publishedResort,
    orderBy: [{ popularityRank: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      summary: true,
      seoTitle: true,
      seoDescription: true,
      island: {
        select: { name: true, status: true, atoll: { select: { name: true, status: true } } },
      },
    },
  });
}

export function getPublishedResort(slug: string) {
  return db.resort.findFirst({
    where: { slug, ...publishedResort },
    select: {
      id: true,
      name: true,
      slug: true,
      summary: true,
      description: true,
      propertyType: true,
      seoTitle: true,
      seoDescription: true,
      island: {
        select: {
          name: true,
          slug: true,
          status: true,
          atoll: { select: { name: true, slug: true, status: true } },
        },
      },
      roomTypes: {
        where: publishedResort,
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, description: true, maxAdults: true },
      },
      diningVenues: {
        where: publishedResort,
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, description: true, cuisine: true },
      },
      transfers: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          label: true,
          durationMinutes: true,
          transferType: { select: { label: true } },
        },
      },
      amenities: { select: { amenityId: true, amenity: { select: { name: true } } } },
      audiences: { select: { audienceTagId: true, audienceTag: { select: { name: true } } } },
    },
  });
}

export function listRooms() {
  return db.roomType.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, status: true, resort: { select: { name: true } } },
  });
}

export function getRoom(id: string) {
  return db.roomType.findUnique({ where: { id } });
}

export function listDining() {
  return db.diningVenue.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, status: true, resort: { select: { name: true } } },
  });
}

export function getDining(id: string) {
  return db.diningVenue.findUnique({ where: { id } });
}

export function listTransfers() {
  return db.transferOption.findMany({
    orderBy: { label: "asc" },
    select: { id: true, label: true, resort: { select: { name: true } } },
  });
}

export function getTransfer(id: string) {
  return db.transferOption.findUnique({ where: { id } });
}

export function listAmenities() {
  return db.amenity.findMany({ orderBy: { name: "asc" } });
}

export function getAmenity(id: string) {
  return db.amenity.findUnique({ where: { id } });
}

export function listAudiences() {
  return db.audienceTag.findMany({ orderBy: { name: "asc" } });
}

export function getAudience(id: string) {
  return db.audienceTag.findUnique({ where: { id } });
}

export function listPublishedResortImages(resortId: string) {
  return db.mediaLink.findMany({
    where: {
      ownerType: "RESORT",
      ownerId: resortId,
      media: { status: "PUBLISHED", kind: { in: ["IMAGE", "DRONE"] } },
    },
    orderBy: { sortOrder: "asc" },
    select: { media: { select: { id: true, altText: true } } },
  });
}

export function listIslandOptions() {
  return db.island.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export function listResortOptions() {
  return db.resort.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export function listVocabulary(
  set:
    | "ROOM_CATEGORY"
    | "VENUE_TYPE"
    | "TRANSFER_TYPE"
    | "PRICE_BAND"
    | "OCCUPANCY_BASIS"
    | "MEAL_PLAN",
) {
  return db.vocabularyItem.findMany({
    where: { set, active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, label: true },
  });
}
