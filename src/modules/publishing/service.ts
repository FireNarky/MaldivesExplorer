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

export const publicationSchedulerActor = "system:publication-scheduler";

async function promoteRows(
  entityType: string,
  rows: Array<{ id: string; scheduledAt: Date | null }>,
  update: (tx: Prisma.TransactionClient, id: string, publishedAt: Date) => Promise<number>,
  now: Date,
): Promise<void> {
  for (const row of rows) {
    await db.$transaction(async (tx) => {
      const count = await update(tx, row.id, now);
      if (count !== 1) return;
      await writeAudit(
        {
          action: "publication.promote",
          entityType,
          entityId: row.id,
          before: { status: "SCHEDULED", scheduledAt: row.scheduledAt?.toISOString() ?? null },
          after: {
            status: "PUBLISHED",
            publishedAt: now.toISOString(),
            actor: publicationSchedulerActor,
          },
        },
        tx,
      );
    });
  }
}

export async function promoteDuePublications(now = new Date()): Promise<void> {
  const where = { status: "SCHEDULED" as const, scheduledAt: { lte: now } };
  const select = { id: true, scheduledAt: true };
  const [atolls, islands, resorts, experiences, articles, collections, offers, faqs, modules] =
    await Promise.all([
      db.atoll.findMany({ where, select }),
      db.island.findMany({ where, select }),
      db.resort.findMany({ where, select }),
      db.experience.findMany({ where, select }),
      db.article.findMany({ where, select }),
      db.collection.findMany({ where, select }),
      db.offer.findMany({ where, select }),
      db.faq.findMany({ where, select }),
      db.homepageModule.findMany({ where, select }),
    ]);
  await promoteRows(
    "atoll",
    atolls,
    async (tx, id) =>
      (
        await tx.atoll.updateMany({
          where: { id, ...where },
          data: { status: "PUBLISHED", publishedAt: now },
        })
      ).count,
    now,
  );
  await promoteRows(
    "island",
    islands,
    async (tx, id) =>
      (
        await tx.island.updateMany({
          where: { id, ...where },
          data: { status: "PUBLISHED", publishedAt: now },
        })
      ).count,
    now,
  );
  await promoteRows(
    "resort",
    resorts,
    async (tx, id) =>
      (
        await tx.resort.updateMany({
          where: { id, ...where },
          data: { status: "PUBLISHED", publishedAt: now },
        })
      ).count,
    now,
  );
  await promoteRows(
    "experience",
    experiences,
    async (tx, id) =>
      (
        await tx.experience.updateMany({
          where: { id, ...where },
          data: { status: "PUBLISHED", publishedAt: now },
        })
      ).count,
    now,
  );
  await promoteRows(
    "article",
    articles,
    async (tx, id) =>
      (
        await tx.article.updateMany({
          where: { id, ...where },
          data: { status: "PUBLISHED", publishedAt: now },
        })
      ).count,
    now,
  );
  await promoteRows(
    "collection",
    collections,
    async (tx, id) =>
      (
        await tx.collection.updateMany({
          where: { id, ...where },
          data: { status: "PUBLISHED", publishedAt: now },
        })
      ).count,
    now,
  );
  await promoteRows(
    "offer",
    offers,
    async (tx, id) =>
      (
        await tx.offer.updateMany({
          where: { id, ...where },
          data: { status: "PUBLISHED", publishedAt: now },
        })
      ).count,
    now,
  );
  await promoteRows(
    "faq",
    faqs,
    async (tx, id) =>
      (
        await tx.faq.updateMany({
          where: { id, ...where },
          data: { status: "PUBLISHED", publishedAt: now },
        })
      ).count,
    now,
  );
  await promoteRows(
    "homepage_module",
    modules,
    async (tx, id) =>
      (
        await tx.homepageModule.updateMany({
          where: { id, ...where },
          data: { status: "PUBLISHED", publishedAt: now },
        })
      ).count,
    now,
  );
}

export const moduleStatus = "implemented" as const;
