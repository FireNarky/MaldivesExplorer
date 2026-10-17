import { createHash, randomUUID } from "node:crypto";
import type { ConsentPurpose, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAudit } from "@/modules/audit/service";
import { enqueueJob } from "@/jobs/worker";
import { ensureCustomer } from "@/modules/wishlist/service";
import { canReadOwnCustomer } from "@/modules/customers/policies";
import {
  claimToken,
  consentWrites,
  isPortalConsentPurpose,
  profileProblems,
  type PortalConsentPurpose,
} from "@/modules/customers/rules";

export const moduleStatus = "implemented" as const;

export class PortalError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PortalError";
    this.status = status;
  }
}

export type AccountProfile = {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  locale: string;
};

export type ConsentChoice = {
  purpose: PortalConsentPurpose;
  status: "GRANTED" | "WITHDRAWN" | "UNSET";
};

const unavailable = "That record is not available.";

export async function openAccount(userId: string) {
  if (!userId) throw new PortalError("Sign in to continue.", 401);
  try {
    const customer = await ensureCustomer(userId);
    if (!canReadOwnCustomer(userId, customer.userId)) throw new PortalError(unavailable, 404);
    return customer;
  } catch (error) {
    if (error instanceof PortalError) throw error;
    if (
      error instanceof Error &&
      error.message === "That email is already linked to another account."
    ) {
      throw new PortalError(error.message, 409);
    }
    throw error;
  }
}

export async function readProfile(userId: string): Promise<AccountProfile> {
  const customer = await openAccount(userId);
  return {
    customerId: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone ?? "",
    countryCode: customer.countryCode ?? "",
    locale: customer.locale,
  };
}

export async function updateProfile(
  userId: string,
  input: { name?: string; phone?: string; countryCode?: string; locale?: string },
): Promise<void> {
  const problems = profileProblems(input);
  const first = Object.values(problems)[0];
  if (first) throw new PortalError(first, 400);
  const customer = await openAccount(userId);
  const data: Prisma.CustomerUpdateInput = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.phone !== undefined) data.phone = input.phone.trim() || null;
  if (input.countryCode !== undefined) {
    data.countryCode = input.countryCode.trim() ? input.countryCode.trim().toUpperCase() : null;
  }
  if (input.locale !== undefined) data.locale = input.locale;
  if (Object.keys(data).length === 0) return;
  await db.$transaction(async (tx) => {
    const updated = await tx.customer.update({ where: { id: customer.id }, data });
    if (!canReadOwnCustomer(userId, updated.userId)) throw new PortalError(unavailable, 404);
    if (input.name !== undefined) {
      await tx.user.update({ where: { id: userId }, data: { name: input.name.trim() } });
    }
    await writeAudit(
      {
        actorId: userId,
        action: "customer.profile",
        entityType: "customer",
        entityId: customer.id,
        before: {
          name: customer.name,
          phone: customer.phone,
          countryCode: customer.countryCode,
          locale: customer.locale,
        },
        after: {
          name: updated.name,
          phone: updated.phone,
          countryCode: updated.countryCode,
          locale: updated.locale,
        },
      },
      tx,
    );
  });
}

export async function readConsent(userId: string): Promise<ConsentChoice[]> {
  const customer = await openAccount(userId);
  const latest = await latestConsent(customer.id);
  return (["ACCOUNT", "ENQUIRY_CONTACT", "ANALYTICS", "MARKETING"] as const).map((purpose) => ({
    purpose,
    status: latest[purpose] ?? "UNSET",
  }));
}

export async function saveConsent(
  userId: string,
  updates: Partial<Record<PortalConsentPurpose, boolean>>,
  ipHash: string | null,
): Promise<void> {
  const customer = await openAccount(userId);
  const latest = await latestConsent(customer.id);
  const writes = consentWrites(latest, updates);
  if (writes.length === 0) return;
  const notice = await db.systemSetting.findUnique({ where: { key: "notice.version" } });
  const noticeVersion =
    notice && typeof notice.value === "string" && notice.value.trim()
      ? notice.value.trim()
      : "2026-10-10";
  await db.$transaction(async (tx) => {
    for (const write of writes) {
      await tx.consentRecord.create({
        data: {
          subjectType: "CUSTOMER",
          subjectId: customer.id,
          purpose: write.purpose,
          status: write.status,
          noticeVersion,
          source: "account",
          withdrawnAt: write.status === "WITHDRAWN" ? new Date() : null,
          ipHash,
        },
      });
      await writeAudit(
        {
          actorId: userId,
          action: write.status === "GRANTED" ? "consent.grant" : "consent.withdraw",
          entityType: "customer",
          entityId: customer.id,
          after: { purpose: write.purpose, noticeVersion },
        },
        tx,
      );
    }
  });
}

export async function requestPrivacy(userId: string, kind: "export" | "deletion"): Promise<void> {
  const customer = await openAccount(userId);
  const type = kind === "export" ? "privacy.export" : "privacy.deletion";
  await enqueueJob({
    type,
    payload: { customerId: customer.id, userId },
    idempotencyKey: `${type}:${customer.id}:${randomUUID()}`,
  });
  await writeAudit({
    actorId: userId,
    action: kind === "export" ? "privacy.export.request" : "privacy.deletion.request",
    entityType: "customer",
    entityId: customer.id,
    after: { job: type },
  });
}

export async function redeemClaim(userId: string, rawToken: string): Promise<{ linked: boolean }> {
  const token = claimToken(rawToken);
  if (!token || !userId) return { linked: false };
  const hashed = createHash("sha256").update(token).digest("hex");
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) return { linked: false };
    const row = await tx.verificationToken.findUnique({ where: { token: hashed } });
    if (!row || !row.identifier.startsWith("claim:")) return { linked: false };
    if (row.expires.getTime() <= Date.now()) {
      await tx.verificationToken.delete({ where: { token: hashed } });
      return { linked: false };
    }
    const email = row.identifier.slice("claim:".length).toLowerCase();
    if (email !== user.email.toLowerCase()) return { linked: false };
    const customer = await tx.customer.findUnique({ where: { email } });
    if (!customer) return { linked: false };
    if (customer.userId && customer.userId !== user.id) return { linked: false };
    if (!customer.userId) {
      await tx.customer.update({ where: { id: customer.id }, data: { userId: user.id } });
      await writeAudit(
        {
          actorId: user.id,
          action: "customer.claim",
          entityType: "customer",
          entityId: customer.id,
          after: { userId: user.id },
        },
        tx,
      );
    }
    await tx.verificationToken.delete({ where: { token: hashed } });
    return { linked: true };
  });
}

async function latestConsent(
  customerId: string,
): Promise<Partial<Record<PortalConsentPurpose, "GRANTED" | "WITHDRAWN">>> {
  const rows = await db.consentRecord.findMany({
    where: {
      subjectType: "CUSTOMER",
      subjectId: customerId,
      purpose: { in: ["ACCOUNT", "ENQUIRY_CONTACT", "ANALYTICS", "MARKETING"] },
    },
    orderBy: { capturedAt: "desc" },
    select: { purpose: true, status: true },
  });
  const latest: Partial<Record<PortalConsentPurpose, "GRANTED" | "WITHDRAWN">> = {};
  for (const row of rows) {
    if (!isPortalConsentPurpose(row.purpose) || latest[row.purpose]) continue;
    latest[row.purpose] = row.status;
  }
  return latest;
}

export function consentPurposeLabel(purpose: ConsentPurpose | PortalConsentPurpose): string {
  const labels: Record<PortalConsentPurpose, string> = {
    ACCOUNT: "Account",
    ENQUIRY_CONTACT: "Trip plans",
    ANALYTICS: "Search analytics on this account",
    MARKETING: "Messages about Maldives trips",
  };
  return isPortalConsentPurpose(purpose) ? labels[purpose] : purpose;
}
