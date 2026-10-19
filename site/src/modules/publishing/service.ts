import type { PermissionCode } from "@/lib/auth/permissions";
import type { Prisma, PublishStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { userHasPermission } from "@/modules/identity/service";
import { writeAudit } from "@/modules/audit/service";
import {
  publicationStamp,
  transitionNeedsPublishPermission,
  type PublicationDates,
} from "@/modules/publishing/workflow";

export async function requirePermission(userId: string, permission: PermissionCode): Promise<void> {
  if (!(await userHasPermission(userId, permission))) {
    throw new Error("This account cannot do that.");
  }
}

export async function separationRequired(): Promise<boolean> {
  const setting = await db.systemSetting.findUnique({
    where: { key: "requireSeparationOfDuties" },
  });
  return setting?.value === true;
}

export async function changeDocument(input: {
  actorId: string;
  permission: PermissionCode;
  entityType: string;
  action: string;
  mutate: (tx: Prisma.TransactionClient) => Promise<{
    id: string;
    before?: Prisma.InputJsonValue | null;
    after?: Prisma.InputJsonValue | null;
  }>;
}): Promise<string> {
  await requirePermission(input.actorId, input.permission);
  return db.$transaction(async (tx) => {
    const result = await input.mutate(tx);
    await writeAudit(
      {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: result.id,
        before: result.before,
        after: result.after,
      },
      tx,
    );
    return result.id;
  });
}

export async function assertTransitionPermission(input: {
  actorId: string;
  next: PublishStatus;
  domain: "catalog" | "content" | "media";
  createdById?: string | null;
}): Promise<void> {
  const permission: PermissionCode =
    input.domain === "media"
      ? "media.write"
      : transitionNeedsPublishPermission(input.next)
        ? input.domain === "catalog"
          ? "catalog.publish"
          : "content.publish"
        : input.domain === "catalog"
          ? "catalog.write"
          : "content.write";
  await requirePermission(input.actorId, permission);
  if (
    input.next === "PUBLISHED" &&
    (await separationRequired()) &&
    input.createdById === input.actorId
  ) {
    throw new Error("Another person must publish this record.");
  }
}

export function stampOrThrow(
  current: PublicationDates,
  next: PublishStatus,
  scheduledAt?: Date | null,
): PublicationDates {
  return publicationStamp(current, next, { scheduledAt });
}

export async function promoteDuePublications(now = new Date()): Promise<void> {
  const due = { status: "SCHEDULED" as const, scheduledAt: { lte: now } };
  const data = { status: "PUBLISHED" as const, publishedAt: now };
  await Promise.all([
    db.atoll.updateMany({ where: due, data }),
    db.island.updateMany({ where: due, data }),
    db.resort.updateMany({ where: due, data }),
    db.experience.updateMany({ where: due, data }),
    db.article.updateMany({ where: due, data }),
    db.collection.updateMany({ where: due, data }),
    db.offer.updateMany({ where: due, data }),
    db.faq.updateMany({ where: due, data }),
    db.homepageModule.updateMany({ where: due, data }),
  ]);
}

export const moduleStatus = "implemented" as const;
