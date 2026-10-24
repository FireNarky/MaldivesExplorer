import type { PublishStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { publishedPublic } from "@/modules/discovery/visibility";
import { recordSlugRedirect } from "@/modules/redirects/service";
import {
  assertTransitionPermission,
  changeDocument,
  stampOrThrow,
} from "@/modules/publishing/service";
import { editableStatus } from "@/modules/publishing/workflow";
import {
  formatDateOnly,
  offerInput,
  offerIsCurrent,
  offerLines,
  parseDateOnly,
  utcToday,
  type OfferInput,
} from "@/modules/offers/rules";

export const moduleStatus = "implemented" as const;

const publicOfferSelect = {
  id: true,
  title: true,
  slug: true,
  summary: true,
  currency: true,
  transferIncluded: true,
  validFrom: true,
  validUntil: true,
  stayFrom: true,
  stayUntil: true,
  minNights: true,
  terms: true,
  seoTitle: true,
  seoDescription: true,
  comparisonBasisNote: true,
  updatedAt: true,
  resort: { select: { name: true, slug: true, status: true } },
  roomType: { select: { name: true, status: true } },
  occupancyBasis: { select: { label: true } },
  mealPlan: { select: { label: true } },
  inclusions: { orderBy: { sortOrder: "asc" as const }, select: { text: true } },
  exclusions: { orderBy: { sortOrder: "asc" as const }, select: { text: true } },
};

export type PublicOffer = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  currency: string;
  transferIncluded: boolean;
  validFrom: string;
  validUntil: string;
  stayFrom: string | null;
  stayUntil: string | null;
  minNights: number | null;
  terms: string;
  seoTitle: string | null;
  seoDescription: string | null;
  priceBasis: string | null;
  resortName: string;
  resortHref: string;
  roomName: string | null;
  occupancy: string;
  mealPlan: string;
  inclusions: string[];
  exclusions: string[];
};

export type OfferPage =
  | { state: "available"; offer: PublicOffer }
  | { state: "expired"; title: string }
  | { state: "absent" };

function toPublic(row: {
  id: string;
  title: string;
  slug: string;
  summary: string;
  currency: string;
  transferIncluded: boolean;
  validFrom: Date;
  validUntil: Date;
  stayFrom: Date | null;
  stayUntil: Date | null;
  minNights: number | null;
  terms: string;
  seoTitle: string | null;
  seoDescription: string | null;
  comparisonBasisNote: string | null;
  resort: { name: string; slug: string };
  roomType: { name: string; status: PublishStatus } | null;
  occupancyBasis: { label: string };
  mealPlan: { label: string };
  inclusions: Array<{ text: string }>;
  exclusions: Array<{ text: string }>;
}): PublicOffer {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    currency: row.currency.trim(),
    transferIncluded: row.transferIncluded,
    validFrom: formatDateOnly(row.validFrom),
    validUntil: formatDateOnly(row.validUntil),
    stayFrom: row.stayFrom ? formatDateOnly(row.stayFrom) : null,
    stayUntil: row.stayUntil ? formatDateOnly(row.stayUntil) : null,
    minNights: row.minNights,
    terms: row.terms,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    priceBasis: row.comparisonBasisNote,
    resortName: row.resort.name,
    resortHref: `/resorts/${row.resort.slug}`,
    roomName: row.roomType?.status === "PUBLISHED" ? row.roomType.name : null,
    occupancy: row.occupancyBasis.label,
    mealPlan: row.mealPlan.label,
    inclusions: row.inclusions.map((item) => item.text),
    exclusions: row.exclusions.map((item) => item.text),
  };
}

const currentWhere = () => {
  const today = utcToday();
  return {
    ...publishedPublic(),
    validFrom: { lte: today },
    validUntil: { gte: today },
    resort: publishedPublic(),
  };
};

export async function listPublicOffers(): Promise<PublicOffer[]> {
  const rows = await db.offer.findMany({
    where: currentWhere(),
    orderBy: { title: "asc" },
    take: 100,
    select: publicOfferSelect,
  });
  return rows.map((row) => toPublic(row));
}

export async function readPublicOffer(slug: string): Promise<OfferPage> {
  const row = await db.offer.findFirst({
    where: { slug, ...publishedPublic(), resort: publishedPublic() },
    select: publicOfferSelect,
  });
  if (!row) return { state: "absent" };
  if (!offerIsCurrent(row.validFrom, row.validUntil)) return { state: "expired", title: row.title };
  return { state: "available", offer: toPublic(row) };
}

export async function listOfferSitemap(): Promise<Array<{ slug: string; updatedAt: Date }>> {
  return db.offer.findMany({
    where: currentWhere(),
    select: { slug: true, updatedAt: true },
  });
}

export async function listOffers() {
  return db.offer.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      resort: { select: { name: true } },
      validUntil: true,
    },
  });
}

export async function getOffer(id: string) {
  return db.offer.findUnique({
    where: { id },
    include: {
      inclusions: { orderBy: { sortOrder: "asc" } },
      exclusions: { orderBy: { sortOrder: "asc" } },
    },
  });
}

function blank(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export async function saveOffer(actorId: string, input: OfferInput, id?: string): Promise<string> {
  const parsed = offerInput.parse(input);
  const validFrom = parseDateOnly(parsed.validFrom);
  const validUntil = parseDateOnly(parsed.validUntil);
  const stayFrom = parseDateOnly(parsed.stayFrom);
  const stayUntil = parseDateOnly(parsed.stayUntil);
  if (!validFrom || !validUntil || validUntil.getTime() < validFrom.getTime()) {
    throw new Error("Enter a validity period.");
  }
  if ((parsed.stayFrom && !stayFrom) || (parsed.stayUntil && !stayUntil)) {
    throw new Error("Enter stay dates as YYYY-MM-DD.");
  }
  if (stayFrom && stayUntil && stayUntil.getTime() < stayFrom.getTime()) {
    throw new Error("Enter a stay period.");
  }
  const nights = parsed.minNights?.trim() ? Number(parsed.minNights) : null;
  if (nights !== null && (!Number.isInteger(nights) || nights < 1 || nights > 90)) {
    throw new Error("Enter a minimum stay from 1 to 90 nights.");
  }
  const roomTypeId = blank(parsed.roomTypeId);
  const resort = await db.resort.findUnique({
    where: { id: parsed.resortId },
    select: { id: true },
  });
  if (!resort) throw new Error("Choose a resort.");
  if (roomTypeId) {
    const room = await db.roomType.findFirst({
      where: { id: roomTypeId, resortId: parsed.resortId },
      select: { id: true },
    });
    if (!room) throw new Error("Choose a room from that resort.");
  }
  const occupancy = await db.vocabularyItem.findFirst({
    where: { id: parsed.occupancyBasisId, set: "OCCUPANCY_BASIS", active: true },
    select: { id: true },
  });
  const meal = await db.vocabularyItem.findFirst({
    where: { id: parsed.mealPlanId, set: "MEAL_PLAN", active: true },
    select: { id: true },
  });
  if (!occupancy || !meal) throw new Error("Choose an occupancy basis and a meal plan.");
  let previousSlug: string | undefined;
  if (id) {
    const current = await getOffer(id);
    if (!current) throw new Error("That offer was not found.");
    if (!editableStatus(current.status)) throw new Error("Unpublish this record before editing.");
    previousSlug = current.slug;
  }
  const inclusions = offerLines(parsed.inclusions);
  const exclusions = offerLines(parsed.exclusions);
  return changeDocument({
    actorId,
    permission: "catalog.write",
    entityType: "offer",
    action: id ? "catalog.update" : "catalog.create",
    mutate: async (tx) => {
      const data = {
        resortId: parsed.resortId,
        roomTypeId,
        title: parsed.title,
        slug: parsed.slug,
        summary: parsed.summary,
        currency: parsed.currency,
        fromPrice: parsed.fromPrice,
        occupancyBasisId: parsed.occupancyBasisId,
        mealPlanId: parsed.mealPlanId,
        transferIncluded: parsed.transferIncluded === "true",
        validFrom,
        validUntil,
        stayFrom,
        stayUntil,
        minNights: nights,
        terms: parsed.terms,
        seoTitle: blank(parsed.seoTitle),
        seoDescription: blank(parsed.seoDescription),
        updatedById: actorId,
      };
      const row = id
        ? await tx.offer.update({ where: { id }, data })
        : await tx.offer.create({ data: { ...data, createdById: actorId } });
      await tx.offerInclusion.deleteMany({ where: { offerId: row.id } });
      await tx.offerExclusion.deleteMany({ where: { offerId: row.id } });
      if (inclusions.length > 0) {
        await tx.offerInclusion.createMany({
          data: inclusions.map((text, sortOrder) => ({ offerId: row.id, text, sortOrder })),
        });
      }
      if (exclusions.length > 0) {
        await tx.offerExclusion.createMany({
          data: exclusions.map((text, sortOrder) => ({ offerId: row.id, text, sortOrder })),
        });
      }
      if (previousSlug && previousSlug !== row.slug) {
        await recordSlugRedirect(tx, `/offers/${previousSlug}`, `/offers/${row.slug}`);
      }
      return { id: row.id, after: { slug: row.slug, status: row.status } };
    },
  });
}

export async function transitionOffer(
  actorId: string,
  id: string,
  next: PublishStatus,
  scheduledAt?: Date | null,
): Promise<void> {
  const current = await getOffer(id);
  if (!current) throw new Error("That offer was not found.");
  await assertTransitionPermission({
    actorId,
    next,
    domain: "catalog",
    createdById: current.createdById,
  });
  const statusData = stampOrThrow(current, next, scheduledAt);
  await changeDocument({
    actorId,
    permission: next === "IN_REVIEW" || next === "DRAFT" ? "catalog.write" : "catalog.publish",
    entityType: "offer",
    action: "catalog.transition",
    mutate: async (tx) => {
      const row = await tx.offer.update({
        where: { id },
        data: { ...statusData, updatedById: actorId },
      });
      return { id: row.id, before: { status: current.status }, after: { status: row.status } };
    },
  });
}
