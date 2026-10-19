import type { SavedEntityType } from "@prisma/client";

export const wishlistEntityTypes = ["RESORT", "OFFER", "EXPERIENCE", "ARTICLE"] as const;

export type WishlistEntityType = (typeof wishlistEntityTypes)[number];

export const viewEntityTypes = [
  "RESORT",
  "OFFER",
  "EXPERIENCE",
  "ARTICLE",
  "ATOLL",
  "ISLAND",
  "COLLECTION",
] as const;

export type ViewEntityType = (typeof viewEntityTypes)[number];

export const anonymousWishlistLimit = 50;
export const compareLimit = 3;
export const defaultRecentLimit = 12;
export const wishlistNoteLimit = 500;

export type WishlistDraft = {
  entityType: WishlistEntityType;
  entityId: string;
  note: string;
  savedAt: string;
};

export type RecentDraft = {
  entityType: ViewEntityType;
  entityId: string;
  viewedAt: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isWishlistType(value: string): value is WishlistEntityType {
  return (wishlistEntityTypes as readonly string[]).includes(value);
}

export function isViewType(value: string): value is ViewEntityType {
  return (viewEntityTypes as readonly string[]).includes(value);
}

export function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

export function wishlistKey(item: Pick<WishlistDraft, "entityType" | "entityId">): string {
  return `${item.entityType}:${item.entityId}`;
}

export function clipNote(value: string): string {
  return value.trim().slice(0, wishlistNoteLimit);
}

export function combineNotes(left: string, right: string): string {
  const first = left.trim();
  const second = right.trim();
  if (!first) return clipNote(second);
  if (!second || first === second) return clipNote(first);
  const ordered = [first, second].sort((a, b) => a.localeCompare(b));
  return clipNote(`${ordered[0]}\n${ordered[1]}`);
}

function byKeyThenTime(a: WishlistDraft, b: WishlistDraft): number {
  const key = wishlistKey(a).localeCompare(wishlistKey(b));
  if (key !== 0) return key;
  return a.savedAt.localeCompare(b.savedAt);
}

export function capAnonymousWishlist(items: WishlistDraft[]): WishlistDraft[] {
  return [...items].sort(byKeyThenTime).slice(0, anonymousWishlistLimit);
}

export function mergeWishlists(server: WishlistDraft[], local: WishlistDraft[]): WishlistDraft[] {
  const merged = new Map<string, WishlistDraft>();
  for (const item of [...server, ...capAnonymousWishlist(local)].sort(byKeyThenTime)) {
    const key = wishlistKey(item);
    const current = merged.get(key);
    if (!current) {
      merged.set(key, { ...item, note: clipNote(item.note) });
      continue;
    }
    merged.set(key, {
      entityType: current.entityType,
      entityId: current.entityId,
      note: combineNotes(current.note, item.note),
      savedAt: current.savedAt <= item.savedAt ? current.savedAt : item.savedAt,
    });
  }
  return [...merged.values()].sort((a, b) => {
    const time = a.savedAt.localeCompare(b.savedAt);
    return time === 0 ? wishlistKey(a).localeCompare(wishlistKey(b)) : time;
  });
}

export function addWishlistItem(
  items: WishlistDraft[],
  next: WishlistDraft,
): { items: WishlistDraft[]; error?: string } {
  const key = wishlistKey(next);
  if (items.some((item) => wishlistKey(item) === key)) {
    return { items };
  }
  if (items.length >= anonymousWishlistLimit) {
    return { items, error: "The saved list on this device holds 50 items." };
  }
  return {
    items: [...items, { ...next, note: clipNote(next.note) }].sort(byKeyThenTime),
  };
}

export function addCompareId(ids: string[], id: string): { ids: string[]; error?: string } {
  if (ids.includes(id)) return { ids };
  if (ids.length >= compareLimit) {
    return { ids, error: "Compare holds 3 resorts." };
  }
  return { ids: [...ids, id] };
}

export function rememberView(
  items: RecentDraft[],
  next: RecentDraft,
  limit: number,
): RecentDraft[] {
  const cap = Number.isInteger(limit) && limit > 0 ? limit : defaultRecentLimit;
  const rest = items.filter(
    (item) => item.entityType !== next.entityType || item.entityId !== next.entityId,
  );
  return [next, ...rest].slice(0, cap);
}

export function canWriteSavedItem(actorUserId: string, ownerUserId: string): boolean {
  return actorUserId.length > 0 && actorUserId === ownerUserId;
}

export function canReadSavedItem(
  actorUserId: string,
  ownerUserId: string,
  permissions: readonly string[],
): boolean {
  return canWriteSavedItem(actorUserId, ownerUserId) || permissions.includes("customer.read");
}

export function asSavedEntityType(value: WishlistEntityType): SavedEntityType {
  return value;
}
