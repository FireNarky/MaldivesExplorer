import type { Prisma, SavedEntityType } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAudit } from "@/modules/audit/service";
import {
  anonymousWishlistLimit,
  canWriteSavedItem,
  clipNote,
  isUuid,
  isViewType,
  isWishlistType,
  mergeWishlists,
  wishlistNoteLimit,
  type ViewEntityType,
  type WishlistDraft,
  type WishlistEntityType,
} from "@/modules/wishlist/rules";

export const moduleStatus = "implemented" as const;

export type ResolvedListing = {
  entityType: WishlistEntityType;
  entityId: string;
  available: boolean;
  name: string | null;
  href: string | null;
  summary: string | null;
  note: string;
  savedItemId: string | null;
};

type Target = { id: string; name: string; href: string | null; summary: string };

async function publishedTarget(
  entityType: WishlistEntityType,
  entityId: string,
): Promise<Target | null> {
  if (entityType === "RESORT") {
    const row = await db.resort.findFirst({
      where: { id: entityId, status: "PUBLISHED" },
      select: { id: true, name: true, slug: true, summary: true },
    });
    return row
      ? { id: row.id, name: row.name, href: `/resorts/${row.slug}`, summary: row.summary }
      : null;
  }
  if (entityType === "EXPERIENCE") {
    const row = await db.experience.findFirst({
      where: { id: entityId, status: "PUBLISHED" },
      select: { id: true, name: true, slug: true, summary: true },
    });
    return row
      ? {
          id: row.id,
          name: row.name,
          href: `/experiences/${row.slug}`,
          summary: row.summary,
        }
      : null;
  }
  if (entityType === "ARTICLE") {
    const row = await db.article.findFirst({
      where: { id: entityId, status: "PUBLISHED" },
      select: { id: true, title: true, slug: true, excerpt: true },
    });
    return row
      ? { id: row.id, name: row.title, href: `/guides/${row.slug}`, summary: row.excerpt }
      : null;
  }
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const row = await db.offer.findFirst({
    where: {
      id: entityId,
      status: "PUBLISHED",
      validFrom: { lte: todayUtc },
      validUntil: { gte: todayUtc },
      resort: { status: "PUBLISHED" },
    },
    select: { id: true, title: true, slug: true, summary: true },
  });
  return row
    ? { id: row.id, name: row.title, href: `/offers/${row.slug}`, summary: row.summary }
    : null;
}

export type PublicCard = {
  entityType: string;
  entityId: string;
  available: boolean;
  name: string | null;
  href: string | null;
  summary: string | null;
};

export async function resolvePublicItems(
  items: Array<{ entityType: string; entityId: string }>,
): Promise<PublicCard[]> {
  const limited = items.slice(0, anonymousWishlistLimit);
  const resolved: PublicCard[] = [];
  for (const item of limited) {
    if (!isUuid(item.entityId) || !isViewType(item.entityType)) continue;
    if (isWishlistType(item.entityType)) {
      const listing = await resolveListing(item.entityType, item.entityId);
      resolved.push({
        entityType: item.entityType,
        entityId: item.entityId,
        available: listing.available,
        name: listing.name,
        href: listing.href,
        summary: listing.summary,
      });
      continue;
    }
    const target = await publishedViewTarget(item.entityType, item.entityId);
    resolved.push({
      entityType: item.entityType,
      entityId: item.entityId,
      available: Boolean(target),
      name: target?.name ?? null,
      href: target?.href ?? null,
      summary: target?.summary ?? null,
    });
  }
  return resolved;
}

async function publishedViewTarget(
  entityType: ViewEntityType,
  entityId: string,
): Promise<{ name: string; href: string; summary: string } | null> {
  if (entityType === "ATOLL") {
    const row = await db.atoll.findFirst({
      where: { id: entityId, status: "PUBLISHED" },
      select: { name: true, slug: true, summary: true },
    });
    return row ? { name: row.name, href: `/atolls/${row.slug}`, summary: row.summary } : null;
  }
  if (entityType === "ISLAND") {
    const row = await db.island.findFirst({
      where: { id: entityId, status: "PUBLISHED" },
      select: { name: true, slug: true, summary: true },
    });
    return row ? { name: row.name, href: `/islands/${row.slug}`, summary: row.summary } : null;
  }
  if (entityType === "COLLECTION") {
    const row = await db.collection.findFirst({
      where: { id: entityId, status: "PUBLISHED" },
      select: { title: true, slug: true, summary: true },
    });
    return row ? { name: row.title, href: `/collections/${row.slug}`, summary: row.summary } : null;
  }
  return null;
}

async function existingTargetIds(entityType: SavedEntityType, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  if (entityType === "RESORT") {
    const rows = await db.resort.findMany({ where: { id: { in: ids } }, select: { id: true } });
    return new Set(rows.map((row) => row.id));
  }
  if (entityType === "EXPERIENCE") {
    const rows = await db.experience.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return new Set(rows.map((row) => row.id));
  }
  if (entityType === "ARTICLE") {
    const rows = await db.article.findMany({ where: { id: { in: ids } }, select: { id: true } });
    return new Set(rows.map((row) => row.id));
  }
  const rows = await db.offer.findMany({ where: { id: { in: ids } }, select: { id: true } });
  return new Set(rows.map((row) => row.id));
}

export async function ensureCustomer(
  userId: string,
  tx: Prisma.TransactionClient | typeof db = db,
) {
  const linked = await tx.customer.findUnique({ where: { userId } });
  if (linked) return linked;
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("That account was not found.");
  const byEmail = await tx.customer.findUnique({ where: { email: user.email } });
  if (byEmail?.userId && byEmail.userId !== userId) {
    throw new Error("That email is already linked to another account.");
  }
  if (byEmail) {
    const updated = await tx.customer.update({ where: { id: byEmail.id }, data: { userId } });
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
  try {
    const created = await tx.customer.create({
      data: { userId, name: user.name, email: user.email },
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
  } catch (error) {
    if (!isUniqueConflict(error) || !("$transaction" in tx)) throw error;
    const existing = await tx.customer.findUnique({ where: { userId } });
    if (existing?.userId === userId) return existing;
    throw error;
  }
}

function isUniqueConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function toDraft(row: {
  entityType: SavedEntityType;
  entityId: string;
  note: string | null;
  createdAt: Date;
}): WishlistDraft | null {
  if (!isWishlistType(row.entityType)) return null;
  return {
    entityType: row.entityType,
    entityId: row.entityId,
    note: row.note ?? "",
    savedAt: row.createdAt.toISOString(),
  };
}

export async function resolveListing(
  entityType: WishlistEntityType,
  entityId: string,
  note = "",
  savedItemId: string | null = null,
): Promise<ResolvedListing> {
  const target = await publishedTarget(entityType, entityId);
  return {
    entityType,
    entityId,
    available: Boolean(target),
    name: target?.name ?? null,
    href: target?.href ?? null,
    summary: target?.summary ?? null,
    note,
    savedItemId,
  };
}

export async function isListingSaved(
  userId: string,
  entityType: WishlistEntityType,
  entityId: string,
): Promise<boolean> {
  const customer = await db.customer.findUnique({
    where: { userId },
    select: { id: true, userId: true },
  });
  if (!customer || !canWriteSavedItem(userId, customer.userId ?? "")) return false;
  const row = await db.savedItem.findUnique({
    where: {
      customerId_entityType_entityId: { customerId: customer.id, entityType, entityId },
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function listSavedItems(userId: string): Promise<ResolvedListing[]> {
  const customer = await db.customer.findUnique({ where: { userId } });
  if (!customer) return [];
  if (!canWriteSavedItem(userId, customer.userId ?? "")) {
    throw new Error("That saved list belongs to another account.");
  }
  const rows = await db.savedItem.findMany({
    where: { customerId: customer.id },
    orderBy: [{ createdAt: "asc" }, { entityType: "asc" }, { entityId: "asc" }],
  });
  return Promise.all(
    rows.flatMap((row) => {
      if (!isWishlistType(row.entityType)) return [];
      return [resolveListing(row.entityType, row.entityId, row.note ?? "", row.id)];
    }),
  );
}

export async function addSavedItem(
  userId: string,
  entityType: WishlistEntityType,
  entityId: string,
): Promise<void> {
  if (!isUuid(entityId)) throw new Error("That listing was not found.");
  const target = await publishedTarget(entityType, entityId);
  if (!target) throw new Error("That listing is not currently published.");
  await db.$transaction(async (tx) => {
    const customer = await ensureCustomer(userId, tx);
    const existing = await tx.savedItem.findUnique({
      where: {
        customerId_entityType_entityId: { customerId: customer.id, entityType, entityId },
      },
    });
    if (existing) return;
    const row = await tx.savedItem.create({
      data: { customerId: customer.id, entityType, entityId, note: null },
    });
    await writeAudit(
      {
        actorId: userId,
        action: "wishlist.add",
        entityType: "saved_item",
        entityId: row.id,
        after: { entityType, targetId: entityId },
      },
      tx,
    );
  });
}

export async function toggleSavedItem(
  userId: string,
  entityType: WishlistEntityType,
  entityId: string,
): Promise<boolean> {
  if (!isUuid(entityId)) throw new Error("That listing was not found.");
  return db.$transaction(async (tx) => {
    const customer = await ensureCustomer(userId, tx);
    const existing = await tx.savedItem.findUnique({
      where: {
        customerId_entityType_entityId: { customerId: customer.id, entityType, entityId },
      },
    });
    if (existing) {
      await tx.savedItem.delete({ where: { id: existing.id } });
      await writeAudit(
        {
          actorId: userId,
          action: "wishlist.remove",
          entityType: "saved_item",
          entityId: existing.id,
          before: { entityType, targetId: entityId },
        },
        tx,
      );
      return false;
    }
    const target = await publishedTarget(entityType, entityId);
    if (!target) throw new Error("That listing is not currently published.");
    const row = await tx.savedItem.create({
      data: { customerId: customer.id, entityType, entityId, note: null },
    });
    await writeAudit(
      {
        actorId: userId,
        action: "wishlist.add",
        entityType: "saved_item",
        entityId: row.id,
        after: { entityType, targetId: entityId },
      },
      tx,
    );
    return true;
  });
}

export async function removeSavedItem(userId: string, savedItemId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const row = await tx.savedItem.findUnique({ where: { id: savedItemId } });
    if (!row) return;
    const customer = await tx.customer.findUnique({ where: { id: row.customerId } });
    if (!customer || !canWriteSavedItem(userId, customer.userId ?? "")) {
      throw new Error("That saved list belongs to another account.");
    }
    await tx.savedItem.delete({ where: { id: row.id } });
    await writeAudit(
      {
        actorId: userId,
        action: "wishlist.remove",
        entityType: "saved_item",
        entityId: row.id,
        before: { entityType: row.entityType, targetId: row.entityId },
      },
      tx,
    );
  });
}

export async function updateSavedNote(
  userId: string,
  savedItemId: string,
  note: string,
): Promise<void> {
  const clipped = clipNote(note);
  if (note.trim().length > wishlistNoteLimit) {
    throw new Error("A note can be 500 characters.");
  }
  await db.$transaction(async (tx) => {
    const row = await tx.savedItem.findUnique({ where: { id: savedItemId } });
    if (!row) throw new Error("That saved item was not found.");
    const customer = await tx.customer.findUnique({ where: { id: row.customerId } });
    if (!customer || !canWriteSavedItem(userId, customer.userId ?? "")) {
      throw new Error("That saved list belongs to another account.");
    }
    await tx.savedItem.update({
      where: { id: row.id },
      data: { note: clipped.length > 0 ? clipped : null },
    });
    await writeAudit(
      {
        actorId: userId,
        action: "wishlist.note",
        entityType: "saved_item",
        entityId: row.id,
        before: { note: row.note },
        after: { note: clipped },
      },
      tx,
    );
  });
}

export async function mergeSavedItems(
  userId: string,
  local: WishlistDraft[],
): Promise<{ saved: number; skipped: number }> {
  const accepted = local.filter((item) => isWishlistType(item.entityType) && isUuid(item.entityId));
  return db.$transaction(async (tx) => {
    const customer = await ensureCustomer(userId, tx);
    if (!canWriteSavedItem(userId, customer.userId ?? "")) {
      throw new Error("That saved list belongs to another account.");
    }
    const present = new Map<SavedEntityType, Set<string>>();
    for (const entityType of ["RESORT", "OFFER", "EXPERIENCE", "ARTICLE"] as const) {
      const ids = accepted
        .filter((item) => item.entityType === entityType)
        .map((item) => item.entityId);
      present.set(entityType, await existingTargetIds(entityType, ids));
    }
    const kept = accepted.filter((item) => present.get(item.entityType)?.has(item.entityId));
    const skipped = accepted.length - kept.length;
    const current = await tx.savedItem.findMany({ where: { customerId: customer.id } });
    const server = current.flatMap((row) => {
      const draft = toDraft(row);
      return draft ? [draft] : [];
    });
    const merged = mergeWishlists(server, kept);
    for (const item of merged) {
      const savedAt = Number.isNaN(Date.parse(item.savedAt)) ? new Date() : new Date(item.savedAt);
      await tx.savedItem.upsert({
        where: {
          customerId_entityType_entityId: {
            customerId: customer.id,
            entityType: item.entityType,
            entityId: item.entityId,
          },
        },
        create: {
          customerId: customer.id,
          entityType: item.entityType,
          entityId: item.entityId,
          note: item.note.length > 0 ? item.note : null,
          createdAt: savedAt,
        },
        update: {
          note: item.note.length > 0 ? item.note : null,
          createdAt: savedAt,
        },
      });
    }
    await writeAudit(
      {
        actorId: userId,
        action: "wishlist.merge",
        entityType: "customer",
        entityId: customer.id,
        before: { count: server.length },
        after: {
          count: merged.length,
          notes: merged.map((item) => ({
            entityType: item.entityType,
            entityId: item.entityId,
            note: item.note,
          })),
        },
      },
      tx,
    );
    return { saved: merged.length, skipped };
  });
}

export async function shortlistLimits(): Promise<{
  wishlist: number;
  compare: number;
  recent: number;
}> {
  const fallback = { wishlist: anonymousWishlistLimit, compare: 3, recent: 12 };
  try {
    const rows = await db.systemSetting.findMany({
      where: {
        key: { in: ["wishlist.maxAnonymous", "comparison.maxItems", "recentlyViewed.limit"] },
      },
    });
    const value = (key: string, fallbackNumber: number) => {
      const row = rows.find((item) => item.key === key);
      return typeof row?.value === "number" && row.value > 0 ? row.value : fallbackNumber;
    };
    return {
      wishlist: value("wishlist.maxAnonymous", fallback.wishlist),
      compare: value("comparison.maxItems", fallback.compare),
      recent: value("recentlyViewed.limit", fallback.recent),
    };
  } catch {
    return fallback;
  }
}
