import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAudit } from "@/modules/audit/service";
import { queueEnquiryAcknowledgement } from "@/modules/communications/service";
import {
  classifyTravelerAge,
  enquiryRateLimit,
  idempotencyKeyError,
  idempotencyWindowHours,
  openEnquiryStatuses,
  parseSubmission,
  qualification,
  submissionFingerprint,
  windowsOverlap,
  type EnquirySubmission,
  type PlannerDraft,
} from "@/modules/enquiries/rules";

export const moduleStatus = "implemented" as const;

export class EnquiryError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;

  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export type EnquiryResult = {
  reference: string;
  duplicate: boolean;
  missing: string[];
  created: boolean;
};

function hashSubmission(submission: EnquirySubmission): string {
  return createHash("sha256").update(submissionFingerprint(submission)).digest("hex");
}

function snapshot(
  submission: EnquirySubmission,
  duplicateOf: string[],
  accepted: { resorts: string[]; offers: string[]; experiences: string[] },
  requestHash: string,
  partySupplied: boolean,
): Prisma.InputJsonObject {
  const gaps = qualification({
    ...blankDraft(submission),
    travelStart: submission.travelStart ?? "",
    travelEnd: submission.travelEnd ?? "",
    budgetMin: submission.budgetMin ?? "",
    budgetMax: submission.budgetMax ?? "",
    tripTypeId: submission.tripTypeId ?? "",
    resortIds: accepted.resorts,
    experienceIds: accepted.experiences,
    offerIds: accepted.offers,
    consent: true,
  });
  return {
    contact: {
      name: submission.name,
      email: submission.email,
      phone: submission.phone,
      countryCode: submission.countryCode,
    },
    party: {
      adults: submission.adultCount,
      childAges: submission.childAges,
      supplied: partySupplied,
    },
    budget: {
      min: submission.budgetMin,
      max: submission.budgetMax,
      currency: submission.budgetCurrency,
    },
    travelStart: submission.travelStart,
    travelEnd: submission.travelEnd,
    flexibility: submission.flexibility,
    tripTypeId: submission.tripTypeId,
    requirements: submission.requirements,
    accessibilityNeeds: submission.accessibilityNeeds,
    resortIds: accepted.resorts,
    offerIds: accepted.offers,
    experienceIds: accepted.experiences,
    consent: { purpose: "ENQUIRY_CONTACT", noticeVersion: submission.noticeVersion },
    attribution: {
      source: submission.source,
      medium: submission.medium,
      campaign: submission.campaign,
      referrer: submission.referrer,
      landingPath: submission.landingPath,
    },
    duplicateOf,
    qualification: gaps,
    requestHash,
  };
}

function blankDraft(submission: EnquirySubmission): PlannerDraft {
  return {
    savedAt: "",
    idempotencyKey: "",
    travelStart: "",
    travelEnd: "",
    flexibility: "",
    budgetMin: "",
    budgetMax: "",
    budgetCurrency: "USD",
    adultCount: String(submission.adultCount),
    childAges: [],
    tripTypeId: "",
    experienceIds: [],
    resortIds: [],
    offerIds: [],
    accessibilityNeeds: submission.accessibilityNeeds ?? "",
    requirements: submission.requirements ?? "",
    name: submission.name,
    email: submission.email,
    phone: submission.phone ?? "",
    countryCode: submission.countryCode ?? "",
    consent: true,
    source: "",
    medium: "",
    campaign: "",
    referrer: "",
    landingPath: "",
  };
}

async function existingResponse(
  idempotencyKey: string,
  requestHash: string,
): Promise<EnquiryResult | null> {
  const enquiry = await db.enquiry.findUnique({
    where: { idempotencyKey },
    select: { reference: true, submittedSnapshot: true },
  });
  if (!enquiry) return null;
  const stored = enquiry.submittedSnapshot;
  const hash =
    stored && typeof stored === "object" && !Array.isArray(stored) && "requestHash" in stored
      ? stored.requestHash
      : null;
  if (hash !== requestHash) {
    throw new EnquiryError("This submission key was already used for a different plan.", 409, {
      idempotencyKey: "This submission key was already used for a different plan.",
    });
  }
  const duplicateOf =
    stored && typeof stored === "object" && !Array.isArray(stored) && "duplicateOf" in stored
      ? stored.duplicateOf
      : [];
  const gaps =
    stored && typeof stored === "object" && !Array.isArray(stored) && "qualification" in stored
      ? stored.qualification
      : null;
  const missing =
    gaps && typeof gaps === "object" && !Array.isArray(gaps) && "missing" in gaps
      ? gaps.missing
      : [];
  return {
    reference: enquiry.reference,
    duplicate: Array.isArray(duplicateOf) && duplicateOf.length > 0,
    missing: Array.isArray(missing)
      ? missing.filter((item): item is string => typeof item === "string")
      : [],
    created: false,
  };
}

async function publishedIds(
  kind: "resort" | "offer" | "experience",
  ids: string[],
): Promise<string[]> {
  if (ids.length === 0) return [];
  if (kind === "resort") {
    const rows = await db.resort.findMany({
      where: { id: { in: ids }, status: "PUBLISHED" },
      select: { id: true },
    });
    return ids.filter((id) => rows.some((row) => row.id === id));
  }
  if (kind === "offer") {
    const rows = await db.offer.findMany({
      where: { id: { in: ids }, status: "PUBLISHED" },
      select: { id: true },
    });
    return ids.filter((id) => rows.some((row) => row.id === id));
  }
  const rows = await db.experience.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    select: { id: true },
  });
  return ids.filter((id) => rows.some((row) => row.id === id));
}

export async function submitEnquiry(
  draft: PlannerDraft,
  context: {
    userId: string | null;
    ipHash: string | null;
    idempotencyKey: string;
    consentSource?: string;
    noticeVersion?: string;
    /** False when the entry point does not collect a party size and adultCount is a placeholder. */
    partySupplied?: boolean;
  },
): Promise<EnquiryResult> {
  const keyError = idempotencyKeyError(context.idempotencyKey);
  if (keyError) throw new EnquiryError(keyError, 400, { idempotencyKey: keyError });
  const notice = await db.systemSetting.findUnique({ where: { key: "notice.version" } });
  const configuredNotice = typeof notice?.value === "string" ? notice.value : "2026-10-10";
  const noticeVersion = context.noticeVersion?.trim() || configuredNotice;
  const parsed = parseSubmission(draft, noticeVersion);
  if ("errors" in parsed) {
    const first = Object.values(parsed.errors)[0] ?? "Check the plan.";
    throw new EnquiryError(first, 400, parsed.errors);
  }
  const submission = parsed.submission;
  if (context.userId) {
    const user = await db.user.findUnique({
      where: { id: context.userId },
      select: { email: true },
    });
    if (!user || user.email.toLowerCase() !== submission.email) {
      throw new EnquiryError("Use the email on your account.", 400, {
        email: "Use the email on your account.",
      });
    }
  }
  const requestHash = hashSubmission(submission);
  const replay = await existingResponse(context.idempotencyKey, requestHash);
  if (replay) return replay;

  const recent = await db.enquiry.count({
    where: {
      customer: { email: submission.email },
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recent >= enquiryRateLimit) {
    throw new EnquiryError("Try again later.", 429);
  }
  if (submission.tripTypeId) {
    const tripType = await db.vocabularyItem.findFirst({
      where: { id: submission.tripTypeId, set: "TRIP_TYPE", active: true },
      select: { id: true },
    });
    if (!tripType) {
      throw new EnquiryError("Choose a trip type.", 400, { tripTypeId: "Choose a trip type." });
    }
  }
  const resorts = await publishedIds("resort", submission.resortIds);
  const offers = await publishedIds("offer", submission.offerIds);
  const experiences = await publishedIds("experience", submission.experienceIds);

  try {
    return await db.$transaction(async (tx) => {
      const again = await tx.enquiry.findUnique({
        where: { idempotencyKey: context.idempotencyKey },
        select: { id: true },
      });
      if (again) {
        const stored = await existingResponse(context.idempotencyKey, requestHash);
        if (stored) return stored;
      }
      const customer = await matchCustomer(tx, submission, context.userId);
      const prior = await tx.enquiry.findMany({
        where: {
          customerId: customer.id,
          status: { in: [...openEnquiryStatuses] },
          travelStart: { not: null },
          travelEnd: { not: null },
        },
        select: { reference: true, travelStart: true, travelEnd: true },
      });
      const duplicateOf = prior.flatMap((row) => {
        const start = row.travelStart?.toISOString().slice(0, 10) ?? null;
        const end = row.travelEnd?.toISOString().slice(0, 10) ?? null;
        return windowsOverlap(submission.travelStart, submission.travelEnd, start, end)
          ? [row.reference]
          : [];
      });
      const [sequence] = await tx.$queryRaw<Array<{ n: bigint }>>`
        SELECT nextval('enquiry_reference_seq') AS n
      `;
      const reference = `ME-E-${String(sequence?.n ?? 0n).padStart(6, "0")}`;
      const gaps = qualification({
        ...blankDraft(submission),
        travelStart: submission.travelStart ?? "",
        travelEnd: submission.travelEnd ?? "",
        budgetMin: submission.budgetMin ?? "",
        budgetMax: submission.budgetMax ?? "",
        tripTypeId: submission.tripTypeId ?? "",
        resortIds: resorts,
        experienceIds: experiences,
        offerIds: offers,
        consent: true,
      });
      const created = await tx.enquiry.create({
        data: {
          reference,
          customerId: customer.id,
          status: "NEW",
          source: submission.source,
          medium: submission.medium,
          campaign: submission.campaign,
          referrer: submission.referrer,
          landingPath: submission.landingPath,
          travelStart: submission.travelStart
            ? new Date(`${submission.travelStart}T00:00:00.000Z`)
            : null,
          travelEnd: submission.travelEnd
            ? new Date(`${submission.travelEnd}T00:00:00.000Z`)
            : null,
          flexibility: submission.flexibility,
          adultCount: submission.adultCount,
          childCount: submission.childAges.length,
          budgetMin: submission.budgetMin,
          budgetMax: submission.budgetMax,
          budgetCurrency: submission.budgetCurrency,
          tripTypeId: submission.tripTypeId,
          requirements: submission.requirements,
          accessibilityNeeds: submission.accessibilityNeeds,
          qualificationScore: gaps.score,
          submittedSnapshot: snapshot(
            submission,
            duplicateOf,
            { resorts, offers, experiences },
            requestHash,
            context.partySupplied ?? true,
          ),
          idempotencyKey: context.idempotencyKey,
          travelers: {
            create: [
              ...Array.from({ length: submission.adultCount }, (_, index) => ({
                travelerType: "ADULT" as const,
                sortOrder: index,
              })),
              ...submission.childAges.map((age, index) => ({
                travelerType: classifyTravelerAge(age) ?? "CHILD",
                ageAtArrival: age,
                sortOrder: submission.adultCount + index,
              })),
            ],
          },
          resorts: { create: resorts.map((resortId) => ({ resortId })) },
          offers: { create: offers.map((offerId) => ({ offerId })) },
          interests: { create: experiences.map((experienceId) => ({ experienceId })) },
          statusHistory: { create: { toStatus: "NEW" } },
        },
        select: { id: true },
      });
      const consent = await tx.consentRecord.create({
        data: {
          subjectType: "CUSTOMER",
          subjectId: customer.id,
          purpose: "ENQUIRY_CONTACT",
          status: "GRANTED",
          noticeVersion: submission.noticeVersion,
          source: context.consentSource ?? "planner",
          ipHash: context.ipHash,
        },
        select: { id: true },
      });
      await writeAudit(
        {
          actorId: context.userId,
          action: "enquiry.create",
          entityType: "enquiry",
          entityId: created.id,
          after: { reference, duplicateOf },
        },
        tx,
      );
      await writeAudit(
        {
          actorId: context.userId,
          action: "consent.grant",
          entityType: "consent_record",
          entityId: consent.id,
          after: { purpose: "ENQUIRY_CONTACT", noticeVersion: submission.noticeVersion },
        },
        tx,
      );
      const claimUrl = customer.userId
        ? null
        : `/register?claim=${await createClaimToken(tx, submission.email)}`;
      await queueEnquiryAcknowledgement(tx, {
        enquiryId: created.id,
        toEmail: submission.email,
        reference,
        claimUrl,
      });
      await tx.idempotencyKey.create({
        data: {
          key: context.idempotencyKey,
          requestHash,
          responseCode: 201,
          responseBody: { reference, duplicate: duplicateOf.length > 0, missing: gaps.missing },
          expiresAt: new Date(Date.now() + idempotencyWindowHours * 60 * 60 * 1000),
        },
      });
      return {
        reference,
        duplicate: duplicateOf.length > 0,
        missing: gaps.missing,
        created: true,
      };
    });
  } catch (error) {
    if (error instanceof EnquiryError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const stored = await existingResponse(context.idempotencyKey, requestHash);
      if (stored) return stored;
    }
    throw error;
  }
}

async function matchCustomer(
  tx: Prisma.TransactionClient,
  submission: EnquirySubmission,
  userId: string | null,
) {
  if (userId) {
    const linked = await tx.customer.findUnique({ where: { userId } });
    if (linked) return linked;
    const byEmail = await tx.customer.findUnique({ where: { email: submission.email } });
    if (byEmail?.userId && byEmail.userId !== userId) {
      throw new EnquiryError("That email is already linked to another account.", 409);
    }
    if (byEmail) {
      const updated = await tx.customer.update({
        where: { id: byEmail.id },
        data: { userId },
      });
      await writeAudit(
        {
          actorId: userId,
          action: "customer.link",
          entityType: "customer",
          entityId: updated.id,
          after: { userId },
        },
        tx,
      );
      return updated;
    }
    const created = await tx.customer.create({
      data: {
        userId,
        name: submission.name,
        email: submission.email,
        phone: submission.phone,
        countryCode: submission.countryCode,
      },
    });
    await writeAudit(
      {
        actorId: userId,
        action: "customer.create",
        entityType: "customer",
        entityId: created.id,
        after: { userId },
      },
      tx,
    );
    return created;
  }
  const existing = await tx.customer.findUnique({ where: { email: submission.email } });
  if (existing) {
    const data: Prisma.CustomerUpdateInput = {};
    if (submission.phone) data.phone = submission.phone;
    if (submission.countryCode) data.countryCode = submission.countryCode;
    const updated =
      Object.keys(data).length > 0
        ? await tx.customer.update({ where: { id: existing.id }, data })
        : existing;
    await writeAudit(
      {
        action: "customer.match",
        entityType: "customer",
        entityId: updated.id,
        after: { matched: true },
      },
      tx,
    );
    return updated;
  }
  const created = await tx.customer.create({
    data: {
      name: submission.name,
      email: submission.email,
      phone: submission.phone,
      countryCode: submission.countryCode,
    },
  });
  await writeAudit(
    {
      action: "customer.create",
      entityType: "customer",
      entityId: created.id,
      after: { account: false },
    },
    tx,
  );
  return created;
}

async function createClaimToken(tx: Prisma.TransactionClient, email: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const hashed = createHash("sha256").update(token).digest("hex");
  await tx.verificationToken.create({
    data: {
      identifier: `claim:${email}`,
      token: hashed,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

export async function plannerCatalog(): Promise<{
  noticeVersion: string;
  draftTtlDays: number;
  tripTypes: Array<{ id: string; label: string }>;
  resorts: Array<{ id: string; name: string }>;
  experiences: Array<{ id: string; name: string }>;
}> {
  const [notice, ttl, tripTypes, resorts, experiences] = await Promise.all([
    db.systemSetting.findUnique({ where: { key: "notice.version" } }),
    db.systemSetting.findUnique({ where: { key: "planner.draftTtlDays" } }),
    db.vocabularyItem.findMany({
      where: { set: "TRIP_TYPE", active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true },
    }),
    db.resort.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { name: "asc" },
      take: 100,
      select: { id: true, name: true },
    }),
    db.experience.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { name: "asc" },
      take: 100,
      select: { id: true, name: true },
    }),
  ]);
  return {
    noticeVersion: typeof notice?.value === "string" ? notice.value : "2026-10-10",
    draftTtlDays: typeof ttl?.value === "number" && ttl.value > 0 ? ttl.value : 30,
    tripTypes,
    resorts,
    experiences,
  };
}
