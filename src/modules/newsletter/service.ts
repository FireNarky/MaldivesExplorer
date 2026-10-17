import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAudit } from "@/modules/audit/service";
import { permissionsForUser } from "@/modules/identity/service";
import {
  emailError,
  idempotencyKeyError,
  normalizeEmail,
  readSubscriptionToken,
  selectedTopics,
  signSubscription,
  statusLabel,
  subscribeDecision,
  topicsFromPreferences,
  type NewsletterTopic,
  type SubscriptionStatusName,
} from "@/modules/newsletter/rules";

export const moduleStatus = "implemented" as const;

const unavailable = "That record is not available.";

export class NewsletterError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "NewsletterError";
    this.status = status;
  }
}

export type SubscribeResult = {
  id: string;
  status: SubscriptionStatusName;
  stored: boolean;
  replayed: boolean;
};

function secret(): string {
  const value = process.env.AUTH_SECRET ?? "";
  if (value.length < 32) throw new NewsletterError("The subscription link is not available.", 500);
  return value;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function subscriptionLink(id: string): string {
  return signSubscription(id, secret());
}

export function subscriptionIdFromToken(token: string): string | null {
  return readSubscriptionToken(token, secret());
}

export async function currentNoticeVersion(): Promise<string> {
  const setting = await db.systemSetting.findUnique({ where: { key: "notice.version" } });
  return typeof setting?.value === "string" && setting.value.trim()
    ? setting.value.trim()
    : "2026-10-10";
}

async function doubleOptIn(): Promise<boolean> {
  const flag = await db.featureFlag.findUnique({
    where: { key: "newsletterDoubleOptIn" },
    select: { enabled: true },
  });
  return flag?.enabled === true;
}

async function requireNewsletter(userId: string, write: boolean): Promise<void> {
  const permissions = await permissionsForUser(userId);
  const allowed = write
    ? permissions.includes("newsletter.write")
    : permissions.includes("newsletter.read") || permissions.includes("newsletter.write");
  if (!allowed) throw new NewsletterError(unavailable, 404);
}

function preferences(topics: readonly string[]): Prisma.InputJsonValue {
  return { topics: selectedTopics(topics) };
}

export async function subscribeNewsletter(input: {
  email: string;
  consent: boolean;
  noticeVersion: string;
  topics: readonly string[];
  source: string;
  ipHash: string | null;
  idempotencyKey: string;
  actorId: string | null;
  website: string;
  replaceTopics: boolean;
}): Promise<SubscribeResult> {
  if (input.website.trim()) return { id: "", status: "CONFIRMED", stored: false, replayed: false };
  if (!input.consent) throw new NewsletterError("Confirm consent before subscribing.");
  const emailProblem = emailError(input.email);
  if (emailProblem) throw new NewsletterError(emailProblem);
  const keyProblem = idempotencyKeyError(input.idempotencyKey);
  if (keyProblem) throw new NewsletterError(keyProblem);
  const notice = await currentNoticeVersion();
  if (input.noticeVersion.trim() !== notice) {
    throw new NewsletterError("Review the current notice and submit again.");
  }
  const email = normalizeEmail(input.email);
  const hash = createHash("sha256")
    .update(JSON.stringify({ email, topics: selectedTopics(input.topics), notice }))
    .digest("hex");
  const existingKey = await db.idempotencyKey.findUnique({ where: { key: input.idempotencyKey } });
  if (existingKey) {
    if (existingKey.requestHash !== hash) {
      throw new NewsletterError("This submission key was already used.", 409);
    }
    const body = existingKey.responseBody;
    if (
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      "id" in body &&
      typeof body.id === "string" &&
      "status" in body &&
      typeof body.status === "string"
    ) {
      return {
        id: body.id,
        status: body.status as SubscriptionStatusName,
        stored: true,
        replayed: true,
      };
    }
  }
  const optIn = await doubleOptIn();
  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.subscription.findUnique({ where: { email } });
      const decision = subscribeDecision({
        doubleOptIn: optIn,
        existing: existing?.status ?? null,
        explicitMarketingConsent: input.consent,
      });
      if (decision === "blocked") {
        throw new NewsletterError("This address cannot be subscribed.", 409);
      }
      if (decision === "preferences" && existing) {
        if (input.replaceTopics) {
          await tx.subscription.update({
            where: { id: existing.id },
            data: { preferences: preferences(input.topics) },
          });
        }
        const result: SubscribeResult = {
          id: existing.id,
          status: "CONFIRMED",
          stored: true,
          replayed: false,
        };
        await tx.idempotencyKey.create({
          data: {
            key: input.idempotencyKey,
            requestHash: hash,
            responseCode: 200,
            responseBody: { id: result.id, status: result.status },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        return result;
      }
      if (decision === "pending" && existing?.status === "PENDING") {
        const result: SubscribeResult = {
          id: existing.id,
          status: "PENDING",
          stored: true,
          replayed: false,
        };
        await tx.idempotencyKey.create({
          data: {
            key: input.idempotencyKey,
            requestHash: hash,
            responseCode: 200,
            responseBody: { id: result.id, status: result.status },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        return result;
      }
      const id = existing?.id ?? randomUUID();
      const consent = await tx.consentRecord.create({
        data: {
          subjectType: "SUBSCRIPTION",
          subjectId: id,
          purpose: "MARKETING",
          status: "GRANTED",
          noticeVersion: notice,
          source: input.source,
          ipHash: input.ipHash,
        },
        select: { id: true },
      });
      const status: SubscriptionStatusName = decision === "pending" ? "PENDING" : "CONFIRMED";
      const token = status === "PENDING" ? randomBytes(32).toString("base64url") : null;
      const data = {
        email,
        status,
        preferences: preferences(input.topics),
        consentRecordId: consent.id,
        confirmTokenHash: token ? hashToken(token) : null,
        subscribedAt: status === "CONFIRMED" ? new Date() : null,
        unsubscribedAt: null,
        source: input.source,
      };
      if (existing) {
        await tx.subscription.update({ where: { id }, data });
      } else {
        await tx.subscription.create({ data: { id, ...data } });
      }
      if (token) {
        const template = await tx.emailTemplate.findFirst({
          where: { code: "newsletter.confirm", locale: "en" },
          select: { id: true },
        });
        await tx.emailDelivery.create({
          data: {
            templateId: template?.id,
            templateCode: "newsletter.confirm",
            toEmail: email,
            classification: "TRANSACTIONAL",
            idempotencyKey: `newsletter.confirm:${consent.id}`,
            status: "QUEUED",
            relatedType: "subscription",
            relatedId: id,
          },
        });
        await tx.job.create({
          data: {
            type: "newsletter.confirm",
            idempotencyKey: `newsletter.confirm:${consent.id}`,
            payload: { subscriptionId: id, token },
          },
        });
      }
      await writeAudit(
        {
          actorId: input.actorId,
          action: "newsletter.subscribe",
          entityType: "subscription",
          entityId: id,
          after: { status, source: input.source },
        },
        tx,
      );
      const result: SubscribeResult = { id, status, stored: true, replayed: false };
      await tx.idempotencyKey.create({
        data: {
          key: input.idempotencyKey,
          requestHash: hash,
          responseCode: status === "CONFIRMED" && !existing ? 201 : 200,
          responseBody: { id, status },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      return result;
    });
  } catch (error) {
    if (error instanceof NewsletterError) throw error;
    throw error;
  }
}

export async function confirmNewsletter(token: string): Promise<SubscriptionStatusName> {
  const hashed = hashToken(token);
  const row = await db.subscription.findUnique({ where: { confirmTokenHash: hashed } });
  if (!row) throw new NewsletterError("This confirmation link is not valid.", 404);
  if (row.status === "SUPPRESSED")
    throw new NewsletterError("This address cannot be subscribed.", 409);
  if (row.status === "UNSUBSCRIBED") {
    throw new NewsletterError("Subscribe again to restart this address.", 409);
  }
  if (row.status === "CONFIRMED") return "CONFIRMED";
  await db.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: row.id },
      data: { status: "CONFIRMED", subscribedAt: new Date(), confirmTokenHash: null },
    });
    await writeAudit(
      {
        action: "newsletter.confirm",
        entityType: "subscription",
        entityId: row.id,
        after: { status: "CONFIRMED" },
      },
      tx,
    );
  });
  return "CONFIRMED";
}

async function recordMarketingWithdrawal(
  tx: Prisma.TransactionClient,
  subscriptionId: string,
  source: string,
): Promise<string> {
  const notice = await currentNoticeVersion();
  const consent = await tx.consentRecord.create({
    data: {
      subjectType: "SUBSCRIPTION",
      subjectId: subscriptionId,
      purpose: "MARKETING",
      status: "WITHDRAWN",
      noticeVersion: notice,
      source,
      withdrawnAt: new Date(),
    },
    select: { id: true },
  });
  return consent.id;
}

export async function unsubscribeNewsletter(id: string): Promise<void> {
  const row = await db.subscription.findUnique({
    where: { id },
    select: { id: true, status: true, consentRecordId: true },
  });
  if (!row) throw new NewsletterError("This link is not valid.", 404);
  if (row.status === "SUPPRESSED" || row.status === "UNSUBSCRIBED") return;
  await db.$transaction(async (tx) => {
    const withdrawalId = await recordMarketingWithdrawal(tx, id, "unsubscribe");
    await tx.subscription.update({
      where: { id },
      data: {
        status: "UNSUBSCRIBED",
        unsubscribedAt: new Date(),
        confirmTokenHash: null,
        consentRecordId: withdrawalId,
      },
    });
    await writeAudit(
      {
        action: "newsletter.unsubscribe",
        entityType: "subscription",
        entityId: id,
        after: { status: "UNSUBSCRIBED", consentRecordId: withdrawalId },
      },
      tx,
    );
  });
}

export async function updateNewsletterPreferences(
  id: string,
  topics: readonly string[],
): Promise<void> {
  const row = await db.subscription.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!row) throw new NewsletterError("This link is not valid.", 404);
  if (row.status !== "CONFIRMED" && row.status !== "PENDING") {
    throw new NewsletterError("Subscribe again before changing preferences.", 409);
  }
  await db.subscription.update({ where: { id }, data: { preferences: preferences(topics) } });
  await writeAudit({
    action: "newsletter.preferences",
    entityType: "subscription",
    entityId: id,
    after: { topics: selectedTopics(topics) },
  });
}

export async function readSubscriptionByEmail(email: string): Promise<{
  id: string;
  status: SubscriptionStatusName;
  statusLabel: string;
  topics: NewsletterTopic[];
  token: string;
} | null> {
  const problem = emailError(email);
  if (problem) return null;
  const row = await db.subscription.findUnique({ where: { email: normalizeEmail(email) } });
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    statusLabel: statusLabel(row.status),
    topics: topicsFromPreferences(row.preferences),
    token: subscriptionLink(row.id),
  };
}

export async function readSubscriptionByToken(token: string): Promise<{
  id: string;
  statusLabel: string;
  status: SubscriptionStatusName;
  topics: NewsletterTopic[];
} | null> {
  const id = subscriptionIdFromToken(token);
  if (!id) return null;
  const row = await db.subscription.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    statusLabel: statusLabel(row.status),
    topics: topicsFromPreferences(row.preferences),
  };
}

export async function listSubscriptions(userId: string): Promise<
  Array<{
    id: string;
    email: string;
    statusLabel: string;
    topics: string;
    consentGranted: boolean;
  }>
> {
  await requireNewsletter(userId, false);
  const rows = await db.subscription.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { consentRecord: { select: { status: true, withdrawnAt: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    statusLabel: statusLabel(row.status),
    topics: topicsFromPreferences(row.preferences)
      .map((topic) => topic)
      .join(", "),
    consentGranted:
      row.consentRecord.status === "GRANTED" && row.consentRecord.withdrawnAt === null,
  }));
}

export async function importSubscriptions(
  userId: string,
  emails: string,
  attestation: boolean,
): Promise<{ imported: number; skipped: number }> {
  await requireNewsletter(userId, true);
  if (!attestation) {
    throw new NewsletterError("Confirm that each address has newsletter consent.");
  }
  const notice = await currentNoticeVersion();
  const list = [
    ...new Set(
      emails
        .split(/[\s,;]+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  ];
  if (list.length === 0) throw new NewsletterError("Enter at least one email address.");
  if (list.length > 50) throw new NewsletterError("Import 50 addresses at a time.");
  let imported = 0;
  let skipped = 0;
  for (const item of list) {
    if (emailError(item)) {
      skipped += 1;
      continue;
    }
    try {
      const result = await subscribeNewsletter({
        email: item,
        consent: true,
        noticeVersion: notice,
        topics: [],
        source: "staff-import",
        ipHash: null,
        idempotencyKey: `import-${randomUUID().replace(/-/g, "").slice(0, 24)}`,
        actorId: userId,
        website: "",
        replaceTopics: false,
      });
      if (result.stored) imported += 1;
      else skipped += 1;
    } catch (error) {
      if (error instanceof NewsletterError) {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }
  await writeAudit({
    actorId: userId,
    action: "newsletter.import",
    entityType: "user",
    entityId: userId,
    after: { imported, skipped, attestation: true },
  });
  return { imported, skipped };
}

export async function suppressSubscription(userId: string, id: string): Promise<void> {
  await requireNewsletter(userId, true);
  const row = await db.subscription.findUnique({
    where: { id },
    select: { id: true, status: true, consentRecordId: true },
  });
  if (!row) throw new NewsletterError(unavailable, 404);
  if (row.status === "SUPPRESSED") return;
  await db.$transaction(async (tx) => {
    const withdrawalId = await recordMarketingWithdrawal(tx, id, "staff-suppress");
    await tx.subscription.update({
      where: { id },
      data: {
        status: "SUPPRESSED",
        unsubscribedAt: row.status === "UNSUBSCRIBED" ? undefined : new Date(),
        confirmTokenHash: null,
        consentRecordId: withdrawalId,
      },
    });
    await writeAudit(
      {
        actorId: userId,
        action: "newsletter.suppress",
        entityType: "subscription",
        entityId: id,
        before: { status: row.status },
        after: { status: "SUPPRESSED", consentRecordId: withdrawalId },
      },
      tx,
    );
  });
}

export async function exportSubscriptions(userId: string): Promise<string> {
  await requireNewsletter(userId, true);
  const capSetting = await db.systemSetting.findUnique({ where: { key: "export.maxRows" } });
  const cap =
    typeof capSetting?.value === "number" && capSetting.value > 0 ? capSetting.value : 5000;
  const rows = await db.subscription.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(cap, 5000),
    include: { consentRecord: { select: { noticeVersion: true, status: true } } },
  });
  const header = "email,status,topics,consent,notice";
  const body = rows.map((row) =>
    [
      row.email,
      row.status,
      topicsFromPreferences(row.preferences).join("|"),
      row.consentRecord.status,
      row.consentRecord.noticeVersion,
    ]
      .map((value) => {
        const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
        return `"${safe.replaceAll('"', '""')}"`;
      })
      .join(","),
  );
  await writeAudit({
    actorId: userId,
    action: "newsletter.export",
    entityType: "user",
    entityId: userId,
    after: { count: rows.length },
  });
  return [header, ...body].join("\n");
}
