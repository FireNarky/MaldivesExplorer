import type { Prisma, PublishStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  assertTransitionPermission,
  changeDocument,
  stampOrThrow,
} from "@/modules/publishing/service";
import { canTransition, editableStatus, type StatusWrite } from "@/modules/publishing/workflow";
import {
  getAmenity,
  getAudience,
  getDining,
  getResort,
  getRoom,
  getTransfer,
} from "@/modules/catalog/repository";
import { recordSlugRedirect } from "@/modules/redirects/service";
import {
  amenityInput,
  audienceInput,
  diningInput,
  resortInput,
  roomInput,
  transferInput,
  type AmenityInput,
  type AudienceInput,
  type DiningInput,
  type ResortInput,
  type RoomInput,
  type TransferInput,
} from "@/modules/catalog/schemas";

function blank(value?: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

function flag(value?: "" | "true" | "false"): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function permissionFor(next: PublishStatus): "catalog.write" | "catalog.publish" {
  return next === "IN_REVIEW" || next === "DRAFT" ? "catalog.write" : "catalog.publish";
}

async function transitionStatus(input: {
  actorId: string;
  id: string;
  next: PublishStatus;
  entityType: string;
  current: { status: PublishStatus; createdById: string | null };
  scheduledAt?: Date | null;
  dates?: {
    status: PublishStatus;
    publishedAt: Date | null;
    scheduledAt: Date | null;
    unpublishedAt: Date | null;
    archivedAt: Date | null;
  };
  beforePublish?: () => void;
  update: (
    tx: Prisma.TransactionClient,
    statusData: StatusWrite,
  ) => Promise<{ id: string; status: PublishStatus }>;
}): Promise<void> {
  if (input.beforePublish && input.next === "PUBLISHED") input.beforePublish();
  await assertTransitionPermission({
    actorId: input.actorId,
    next: input.next,
    domain: "catalog",
    createdById: input.current.createdById,
  });
  const statusData = input.dates
    ? { ...stampOrThrow(input.dates, input.next, input.scheduledAt), updatedById: input.actorId }
    : (() => {
        if (!canTransition(input.current.status, input.next)) {
          throw new Error(`Cannot move from ${input.current.status} to ${input.next}.`);
        }
        return { status: input.next, updatedById: input.actorId };
      })();
  await changeDocument({
    actorId: input.actorId,
    permission: permissionFor(input.next),
    entityType: input.entityType,
    action: "catalog.transition",
    mutate: async (tx) => {
      const row = await input.update(tx, statusData);
      return {
        id: row.id,
        before: { status: input.current.status },
        after: { status: row.status },
      };
    },
  });
}

export async function saveResort(
  actorId: string,
  input: ResortInput,
  id?: string,
): Promise<string> {
  const parsed = resortInput.parse(input);
  let previousSlug: string | undefined;
  if (id) {
    const current = await getResort(id);
    if (!current) throw new Error("That resort was not found.");
    if (!editableStatus(current.status)) throw new Error("Unpublish this record before editing.");
    previousSlug = current.slug;
  }
  const island = await db.island.findUnique({
    where: { id: parsed.islandId },
    select: { id: true },
  });
  if (!island) throw new Error("Choose an island.");
  const price = parsed.indicativeFromPrice ? parsed.indicativeFromPrice : null;
  return changeDocument({
    actorId,
    permission: "catalog.write",
    entityType: "resort",
    action: id ? "catalog.update" : "catalog.create",
    mutate: async (tx) => {
      const data = {
        islandId: parsed.islandId,
        name: parsed.name,
        slug: parsed.slug,
        propertyType: parsed.propertyType,
        summary: parsed.summary,
        description: parsed.description,
        editorialPositioning: blank(parsed.editorialPositioning),
        priceBandId: blank(parsed.priceBandId),
        seoTitle: blank(parsed.seoTitle),
        seoDescription: blank(parsed.seoDescription),
        indicativeFromPrice: price,
        indicativeCurrency: blank(parsed.indicativeCurrency),
        priceBasis: blank(parsed.priceBasis),
        priceIncludesTransfer: price ? flag(parsed.priceIncludesTransfer) : null,
        priceIncludesTax: price ? flag(parsed.priceIncludesTax) : null,
        priceSourceNote: price ? blank(parsed.priceSourceNote) : null,
        priceReviewedAt: price && parsed.priceReviewedAt ? new Date(parsed.priceReviewedAt) : null,
        hasHouseReef: flag(parsed.hasHouseReef),
        reefSummary: blank(parsed.reefSummary),
        diveCenterSummary: blank(parsed.diveCenterSummary),
        reefSourceNote: blank(parsed.reefSourceNote),
        reefReviewedAt: parsed.reefReviewedAt ? new Date(parsed.reefReviewedAt) : null,
        starCategory: parsed.starCategory ? Number(parsed.starCategory) : null,
        starCategorySource: blank(parsed.starCategorySource),
        checkInNotes: blank(parsed.checkInNotes),
        updatedById: actorId,
      };
      const row = id
        ? await tx.resort.update({ where: { id }, data })
        : await tx.resort.create({ data: { ...data, createdById: actorId } });
      if (previousSlug && previousSlug !== row.slug) {
        await recordSlugRedirect(tx, `/resorts/${previousSlug}`, `/resorts/${row.slug}`);
      }
      return { id: row.id, after: { slug: row.slug, status: row.status } };
    },
  });
}

export async function transitionResort(
  actorId: string,
  id: string,
  next: PublishStatus,
  scheduledAt?: Date | null,
): Promise<void> {
  const current = await getResort(id);
  if (!current) throw new Error("That resort was not found.");
  await transitionStatus({
    actorId,
    id,
    next,
    entityType: "resort",
    current,
    scheduledAt,
    dates: current,
    beforePublish: () => {
      if (!current.seoTitle || !current.seoDescription) {
        throw new Error("Enter the SEO title and description before publishing.");
      }
    },
    update: (tx, statusData) => tx.resort.update({ where: { id }, data: statusData }),
  });
}

export async function saveRoom(actorId: string, input: RoomInput, id?: string): Promise<string> {
  const parsed = roomInput.parse(input);
  if (id) {
    const current = await getRoom(id);
    if (!current) throw new Error("That room type was not found.");
    if (!editableStatus(current.status)) throw new Error("Unpublish this record before editing.");
  }
  return changeDocument({
    actorId,
    permission: "catalog.write",
    entityType: "room_type",
    action: id ? "catalog.update" : "catalog.create",
    mutate: async (tx) => {
      const data = { ...parsed, updatedById: actorId };
      const row = id
        ? await tx.roomType.update({ where: { id }, data })
        : await tx.roomType.create({ data: { ...data, createdById: actorId } });
      return { id: row.id, after: { slug: row.slug, status: row.status } };
    },
  });
}

export async function transitionRoom(
  actorId: string,
  id: string,
  next: PublishStatus,
): Promise<void> {
  const current = await getRoom(id);
  if (!current) throw new Error("That room type was not found.");
  await transitionStatus({
    actorId,
    id,
    next,
    entityType: "room_type",
    current,
    update: (tx, statusData) =>
      tx.roomType.update({
        where: { id },
        data: { status: statusData.status as PublishStatus, updatedById: actorId },
      }),
  });
}

export async function saveDining(
  actorId: string,
  input: DiningInput,
  id?: string,
): Promise<string> {
  const parsed = diningInput.parse(input);
  if (id) {
    const current = await getDining(id);
    if (!current) throw new Error("That dining venue was not found.");
    if (!editableStatus(current.status)) throw new Error("Unpublish this record before editing.");
  }
  return changeDocument({
    actorId,
    permission: "catalog.write",
    entityType: "dining_venue",
    action: id ? "catalog.update" : "catalog.create",
    mutate: async (tx) => {
      const data = {
        resortId: parsed.resortId,
        venueTypeId: parsed.venueTypeId,
        name: parsed.name,
        description: parsed.description,
        cuisine: blank(parsed.cuisine),
        updatedById: actorId,
      };
      const row = id
        ? await tx.diningVenue.update({ where: { id }, data })
        : await tx.diningVenue.create({ data: { ...data, createdById: actorId } });
      return { id: row.id, after: { name: row.name, status: row.status } };
    },
  });
}

export async function transitionDining(
  actorId: string,
  id: string,
  next: PublishStatus,
): Promise<void> {
  const current = await getDining(id);
  if (!current) throw new Error("That dining venue was not found.");
  await transitionStatus({
    actorId,
    id,
    next,
    entityType: "dining_venue",
    current,
    update: (tx, statusData) =>
      tx.diningVenue.update({
        where: { id },
        data: { status: statusData.status as PublishStatus, updatedById: actorId },
      }),
  });
}

export async function saveTransfer(
  actorId: string,
  input: TransferInput,
  id?: string,
): Promise<string> {
  const parsed = transferInput.parse(input);
  if (id && !(await getTransfer(id))) throw new Error("That transfer was not found.");
  const minutes = parsed.durationMinutes ? Number(parsed.durationMinutes) : null;
  if (minutes !== null && (!Number.isInteger(minutes) || minutes <= 0)) {
    throw new Error("Duration must be a positive number of minutes.");
  }
  return changeDocument({
    actorId,
    permission: "catalog.write",
    entityType: "transfer_option",
    action: id ? "catalog.update" : "catalog.create",
    mutate: async (tx) => {
      const data = {
        resortId: parsed.resortId,
        transferTypeId: parsed.transferTypeId,
        label: parsed.label,
        durationMinutes: minutes,
        sourceNote: minutes ? blank(parsed.sourceNote) : null,
        notes: blank(parsed.notes),
      };
      const row = id
        ? await tx.transferOption.update({ where: { id }, data })
        : await tx.transferOption.create({ data });
      return { id: row.id, after: { label: row.label } };
    },
  });
}

export async function saveAmenity(
  actorId: string,
  input: AmenityInput,
  id?: string,
): Promise<string> {
  const parsed = amenityInput.parse(input);
  if (id) {
    const current = await getAmenity(id);
    if (!current) throw new Error("That amenity was not found.");
    if (current.code !== parsed.code) throw new Error("The code cannot change.");
  }
  return changeDocument({
    actorId,
    permission: "catalog.write",
    entityType: "amenity",
    action: id ? "catalog.update" : "catalog.create",
    mutate: async (tx) => {
      const data = {
        name: parsed.name,
        category: parsed.category,
        description: blank(parsed.description),
      };
      const row = id
        ? await tx.amenity.update({ where: { id }, data })
        : await tx.amenity.create({ data: { ...data, code: parsed.code } });
      return { id: row.id, after: { code: row.code } };
    },
  });
}

export async function saveAudience(
  actorId: string,
  input: AudienceInput,
  id?: string,
): Promise<string> {
  const parsed = audienceInput.parse(input);
  if (id) {
    const current = await getAudience(id);
    if (!current) throw new Error("That audience tag was not found.");
    if (current.code !== parsed.code) throw new Error("The code cannot change.");
  }
  return changeDocument({
    actorId,
    permission: "catalog.write",
    entityType: "audience_tag",
    action: id ? "catalog.update" : "catalog.create",
    mutate: async (tx) => {
      const row = id
        ? await tx.audienceTag.update({ where: { id }, data: { name: parsed.name } })
        : await tx.audienceTag.create({ data: parsed });
      return { id: row.id, after: { code: row.code } };
    },
  });
}

export async function linkResortAmenity(
  actorId: string,
  resortId: string,
  amenityId: string,
): Promise<void> {
  await changeDocument({
    actorId,
    permission: "catalog.write",
    entityType: "resort",
    action: "catalog.update",
    mutate: async (tx) => {
      await tx.resortAmenity.upsert({
        where: { resortId_amenityId: { resortId, amenityId } },
        update: {},
        create: { resortId, amenityId },
      });
      return { id: resortId, after: { amenityId } };
    },
  });
}

export async function linkResortAudience(
  actorId: string,
  resortId: string,
  audienceTagId: string,
): Promise<void> {
  await changeDocument({
    actorId,
    permission: "catalog.write",
    entityType: "resort",
    action: "catalog.update",
    mutate: async (tx) => {
      await tx.resortAudience.upsert({
        where: { resortId_audienceTagId: { resortId, audienceTagId } },
        update: {},
        create: { resortId, audienceTagId },
      });
      return { id: resortId, after: { audienceTagId } };
    },
  });
}

export const moduleStatus = "implemented" as const;
