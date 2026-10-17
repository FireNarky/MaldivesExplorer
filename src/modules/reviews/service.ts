import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAudit } from "@/modules/audit/service";
import { permissionsForUser } from "@/modules/identity/service";
import { canModerateReview, canPublishReview } from "@/modules/reviews/policies";
import {
  enquiryReference,
  evidenceLabel,
  featureAllowed,
  firstPartyEvidence,
  isReviewSource,
  parseRating,
  publicReviewLabel,
  publishBlock,
  staffModerationLabel,
  staffSourceLabel,
  writtenPermissionReference,
  type ModerationStatusName,
  type ReviewSourceName,
} from "@/modules/reviews/rules";

export const moduleStatus = "implemented" as const;

const unavailable = "That record is not available.";

export class ReviewError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ReviewError";
    this.status = status;
  }
}

export type ReviewInput = {
  resortId: string;
  sourceType: string;
  sourceReference: string;
  displayName: string;
  rating: string;
  ratingBasis: string;
  body: string;
  consent: boolean;
};

export type PublicReview = {
  id: string;
  displayName: string;
  body: string;
  rating: string | null;
  ratingBasis: string | null;
  label: string;
  resortName: string | null;
  resortHref: string | null;
};

type ReviewRow = {
  id: string;
  resortId: string | null;
  sourceType: ReviewSourceName;
  sourceReference: string | null;
  displayName: string;
  rating: { toString(): string } | null;
  ratingBasis: string | null;
  body: string;
  verificationStatus: "VERIFIED" | "UNVERIFIED" | "REJECTED";
  consentStatus: "GRANTED" | "WITHDRAWN";
  moderationStatus: ModerationStatusName;
  featured: boolean;
  publishedAt: Date | null;
  resort: { name: string; slug: string; status: string } | null;
};

function text(value: string, max: number, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new ReviewError(`Enter ${label}.`);
  if (trimmed.length > max) throw new ReviewError(`${label} is too long.`);
  return trimmed;
}

function rethrow(error: unknown): never {
  if (error instanceof ReviewError) throw error;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("reviews_featured")) {
    throw new ReviewError("An imported rating cannot be featured.", 409);
  }
  if (message.includes("reviews_publish")) {
    throw new ReviewError("Publish an approved review.", 409);
  }
  if (message.includes("reviews_rating")) {
    throw new ReviewError("Enter a rating from 0 to 5.", 400);
  }
  throw error;
}

async function requireStaff(userId: string, publish: boolean): Promise<void> {
  const permissions = await permissionsForUser(userId);
  const allowed = publish ? canPublishReview(permissions) : canModerateReview(permissions);
  if (!allowed) throw new ReviewError(unavailable, 404);
}

async function evidenceFor(
  source: ReviewSourceName,
  sourceReference: string,
  resortId: string | null,
): Promise<"VERIFIED" | "UNVERIFIED" | "REJECTED"> {
  if (source !== "FIRST_PARTY") return "UNVERIFIED";
  const reference = enquiryReference(sourceReference);
  if (!reference) {
    return firstPartyEvidence({
      wonEnquiry: false,
      writtenPermission: writtenPermissionReference(sourceReference),
    });
  }
  const enquiry = await db.enquiry.findUnique({
    where: { reference },
    select: {
      status: true,
      resorts: { select: { resortId: true } },
      quotes: {
        select: {
          versions: {
            where: { status: "ACCEPTED" },
            select: { segments: { select: { resortId: true } } },
          },
        },
      },
    },
  });
  const accepted = enquiry?.quotes.some((quote) => quote.versions.length > 0) === true;
  const resortMatches =
    !resortId ||
    enquiry?.resorts.some((row) => row.resortId === resortId) === true ||
    enquiry?.quotes.some((quote) =>
      quote.versions.some((version) =>
        version.segments.some((segment) => segment.resortId === resortId),
      ),
    ) === true;
  return firstPartyEvidence({
    wonEnquiry: enquiry?.status === "WON" && accepted && resortMatches,
    writtenPermission: false,
  });
}

function toPublic(row: ReviewRow): PublicReview {
  const ratingNumber = row.rating ? Number(row.rating.toString()) : null;
  const resortPublished = row.resort?.status === "PUBLISHED";
  return {
    id: row.id,
    displayName: row.displayName,
    body: row.body,
    rating: ratingNumber === null || Number.isNaN(ratingNumber) ? null : ratingNumber.toFixed(1),
    ratingBasis: row.ratingBasis,
    label: publicReviewLabel(row.sourceType, row.verificationStatus),
    resortName: resortPublished ? (row.resort?.name ?? null) : null,
    resortHref: resortPublished && row.resort ? `/resorts/${row.resort.slug}` : null,
  };
}

const publicSelect = {
  id: true,
  resortId: true,
  sourceType: true,
  sourceReference: true,
  displayName: true,
  rating: true,
  ratingBasis: true,
  body: true,
  verificationStatus: true,
  consentStatus: true,
  moderationStatus: true,
  featured: true,
  publishedAt: true,
  resort: { select: { name: true, slug: true, status: true } },
} satisfies Prisma.ReviewSelect;

export async function listReviewResorts(): Promise<
  Array<{ id: string; name: string; status: string }>
> {
  return db.resort.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { id: true, name: true, status: true },
    orderBy: { name: "asc" },
    take: 100,
  });
}

export async function listReviews(userId: string): Promise<
  Array<{
    id: string;
    displayName: string;
    sourceLabel: string;
    moderationLabel: string;
    featured: boolean;
  }>
> {
  await requireStaff(userId, false);
  const rows = await db.review.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      displayName: true,
      sourceType: true,
      moderationStatus: true,
      featured: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    displayName: row.displayName,
    sourceLabel: staffSourceLabel(row.sourceType),
    moderationLabel: staffModerationLabel(row.moderationStatus),
    featured: row.featured,
  }));
}

export type StaffReview = {
  id: string;
  resortId: string;
  sourceType: ReviewSourceName;
  sourceReference: string;
  displayName: string;
  rating: string;
  ratingBasis: string;
  body: string;
  consentGranted: boolean;
  evidence: string;
  moderationLabel: string;
  moderationStatus: ModerationStatusName;
  featured: boolean;
  published: boolean;
  canPublish: boolean;
  history: Array<{ label: string; at: string }>;
};

function historyLabel(action: string): string {
  if (action === "review.create") return "Created";
  if (action === "review.update") return "Updated";
  if (action === "review.publish") return "Published";
  if (action === "review.hide") return "Hidden";
  if (action === "review.reject") return "Rejected";
  if (action === "review.feature") return "Featured";
  if (action === "review.unfeature") return "Removed from testimonials";
  return action;
}

export async function readReview(userId: string, id: string): Promise<StaffReview> {
  await requireStaff(userId, false);
  const permissions = await permissionsForUser(userId);
  const row = await db.review.findUnique({ where: { id }, select: publicSelect });
  if (!row) throw new ReviewError(unavailable, 404);
  const history = await db.auditLog.findMany({
    where: { entityType: "review", entityId: id },
    orderBy: { occurredAt: "desc" },
    take: 20,
    select: { action: true, occurredAt: true },
  });
  return {
    id: row.id,
    resortId: row.resortId ?? "",
    sourceType: row.sourceType,
    sourceReference: row.sourceReference ?? "",
    displayName: row.displayName,
    rating: row.rating ? Number(row.rating.toString()).toFixed(1) : "",
    ratingBasis: row.ratingBasis ?? "",
    body: row.body,
    consentGranted: row.consentStatus === "GRANTED",
    evidence: evidenceLabel(row.verificationStatus),
    moderationLabel: staffModerationLabel(row.moderationStatus),
    moderationStatus: row.moderationStatus,
    featured: row.featured,
    published: row.publishedAt !== null,
    canPublish: canPublishReview(permissions),
    history: history.map((item) => ({
      label: historyLabel(item.action),
      at: item.occurredAt.toISOString().slice(0, 16).replace("T", " "),
    })),
  };
}

async function parsed(input: ReviewInput): Promise<{
  resortId: string | null;
  sourceType: ReviewSourceName;
  sourceReference: string;
  displayName: string;
  rating: string | null;
  ratingBasis: string;
  body: string;
  verification: "VERIFIED" | "UNVERIFIED";
}> {
  if (!input.consent) throw new ReviewError("Record permission before saving this review.");
  if (!isReviewSource(input.sourceType)) throw new ReviewError("Choose a source.");
  const resortId = input.resortId.trim();
  if (resortId && !/^[0-9a-f-]{36}$/i.test(resortId)) throw new ReviewError("Choose a resort.");
  if (resortId) {
    const resort = await db.resort.findUnique({ where: { id: resortId }, select: { id: true } });
    if (!resort) throw new ReviewError("Choose a resort.");
  }
  const rating = parseRating(input.rating);
  if (input.rating.trim() && !rating) throw new ReviewError("Enter a rating from 0 to 5.");
  const sourceReference = input.sourceReference.trim();
  if (sourceReference.length > 200) throw new ReviewError("The source reference is too long.");
  const verification = await evidenceFor(input.sourceType, sourceReference, resortId || null);
  if (verification === "REJECTED") throw new ReviewError("Choose a source.");
  return {
    resortId: resortId || null,
    sourceType: input.sourceType,
    sourceReference,
    displayName: text(input.displayName, 80, "a display name"),
    rating,
    ratingBasis: input.ratingBasis.trim().slice(0, 200),
    body: text(input.body, 4000, "the review"),
    verification,
  };
}

export async function createReview(userId: string, input: ReviewInput): Promise<string> {
  await requireStaff(userId, false);
  const value = await parsed(input);
  try {
    return await db.$transaction(async (tx) => {
      const row = await tx.review.create({
        data: {
          resortId: value.resortId,
          sourceType: value.sourceType,
          sourceReference: value.sourceReference || null,
          displayName: value.displayName,
          rating: value.rating,
          ratingBasis: value.ratingBasis || null,
          body: value.body,
          verificationStatus: value.verification,
          consentStatus: "GRANTED",
          moderationStatus: "PENDING",
          featured: false,
        },
        select: { id: true },
      });
      await writeAudit(
        {
          actorId: userId,
          action: "review.create",
          entityType: "review",
          entityId: row.id,
          after: { sourceType: value.sourceType, moderationStatus: "PENDING" },
        },
        tx,
      );
      return row.id;
    });
  } catch (error) {
    rethrow(error);
  }
}

export async function updateReview(userId: string, id: string, input: ReviewInput): Promise<void> {
  await requireStaff(userId, false);
  const value = await parsed(input);
  try {
    await db.$transaction(async (tx) => {
      const current = await tx.review.findUnique({ where: { id } });
      if (!current) throw new ReviewError(unavailable, 404);
      if (
        value.sourceType !== current.sourceType ||
        (value.sourceReference || null) !== current.sourceReference ||
        value.resortId !== current.resortId
      ) {
        throw new ReviewError("The source of a review stays as it was recorded.", 409);
      }
      await tx.review.update({
        where: { id },
        data: {
          displayName: value.displayName,
          rating: value.rating,
          ratingBasis: value.ratingBasis || null,
          body: value.body,
          moderationStatus: "PENDING",
          featured: false,
          publishedAt: null,
        },
      });
      await writeAudit(
        {
          actorId: userId,
          action: "review.update",
          entityType: "review",
          entityId: id,
          after: {
            sourceType: current.sourceType,
            verificationStatus: current.verificationStatus,
            moderationStatus: "PENDING",
          },
        },
        tx,
      );
    });
  } catch (error) {
    rethrow(error);
  }
}

export async function publishReview(userId: string, id: string): Promise<void> {
  await requireStaff(userId, true);
  try {
    await db.$transaction(async (tx) => {
      const current = await tx.review.findUnique({ where: { id } });
      if (!current) throw new ReviewError(unavailable, 404);
      if (current.moderationStatus === "REJECTED") {
        throw new ReviewError("A rejected review stays unpublished.", 409);
      }
      const block = publishBlock({
        source: current.sourceType,
        verification: current.verificationStatus,
        consentGranted: current.consentStatus === "GRANTED",
        sourceReference: current.sourceReference ?? "",
        ratingBasis: current.ratingBasis ?? "",
      });
      if (block) throw new ReviewError(block, 409);
      await tx.review.update({
        where: { id },
        data: {
          moderationStatus: "APPROVED",
          publishedAt: current.publishedAt ?? new Date(),
          featured: current.sourceType === "IMPORTED" ? false : current.featured,
        },
      });
      await writeAudit(
        {
          actorId: userId,
          action: "review.publish",
          entityType: "review",
          entityId: id,
          after: { moderationStatus: "APPROVED", sourceType: current.sourceType },
        },
        tx,
      );
    });
  } catch (error) {
    rethrow(error);
  }
}

async function closeReview(
  userId: string,
  id: string,
  status: "HIDDEN" | "REJECTED",
  action: string,
): Promise<void> {
  await requireStaff(userId, false);
  try {
    await db.$transaction(async (tx) => {
      const current = await tx.review.findUnique({ where: { id }, select: { id: true } });
      if (!current) throw new ReviewError(unavailable, 404);
      await tx.review.update({
        where: { id },
        data: { moderationStatus: status, publishedAt: null, featured: false },
      });
      await writeAudit(
        {
          actorId: userId,
          action,
          entityType: "review",
          entityId: id,
          after: { moderationStatus: status, featured: false },
        },
        tx,
      );
    });
  } catch (error) {
    rethrow(error);
  }
}

export async function hideReview(userId: string, id: string): Promise<void> {
  await closeReview(userId, id, "HIDDEN", "review.hide");
}

export async function rejectReview(userId: string, id: string): Promise<void> {
  await closeReview(userId, id, "REJECTED", "review.reject");
}

export async function featureReview(userId: string, id: string, featured: boolean): Promise<void> {
  await requireStaff(userId, true);
  try {
    await db.$transaction(async (tx) => {
      const current = await tx.review.findUnique({ where: { id } });
      if (!current) throw new ReviewError(unavailable, 404);
      if (
        featured &&
        !featureAllowed({
          source: current.sourceType,
          moderation: current.moderationStatus,
          published: current.publishedAt !== null,
        })
      ) {
        throw new ReviewError(
          current.sourceType === "IMPORTED"
            ? "An imported rating cannot be featured."
            : "Publish the review before featuring it.",
          409,
        );
      }
      await tx.review.update({ where: { id }, data: { featured } });
      await writeAudit(
        {
          actorId: userId,
          action: featured ? "review.feature" : "review.unfeature",
          entityType: "review",
          entityId: id,
          after: { featured, sourceType: current.sourceType },
        },
        tx,
      );
    });
  } catch (error) {
    rethrow(error);
  }
}

const publicReviewWhere = {
  moderationStatus: "APPROVED" as const,
  publishedAt: { not: null },
  OR: [
    { sourceType: "EDITORIAL" as const },
    { sourceType: "IMPORTED" as const },
    { sourceType: "FIRST_PARTY" as const, verificationStatus: "VERIFIED" as const },
  ],
};

async function publishedRows(where: Prisma.ReviewWhereInput): Promise<PublicReview[]> {
  const rows = await db.review.findMany({
    where: { ...where, ...publicReviewWhere },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
    take: 50,
    select: publicSelect,
  });
  return rows.map((row) => toPublic(row));
}

export async function listPublishedForResort(resortId: string): Promise<PublicReview[]> {
  return publishedRows({ resortId });
}

export async function listTestimonials(): Promise<PublicReview[]> {
  return publishedRows({ featured: true, sourceType: { not: "IMPORTED" } });
}
