import {
  addCompareId,
  addWishlistItem,
  anonymousWishlistLimit,
  compareLimit,
  clipNote,
  isUuid,
  isViewType,
  isWishlistType,
  rememberView,
  type RecentDraft,
  type ViewEntityType,
  type WishlistDraft,
  type WishlistEntityType,
} from "@/modules/wishlist/rules";

const wishlistKey = "me.wishlist.v1";
const compareKey = "me.compare.v1";
const recentKey = "me.recent.v1";

export const shortlistChanged = "me-shortlist-changed";

function readJson(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(shortlistChanged));
}

function draftFrom(value: unknown): WishlistDraft | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.entityType !== "string" || !isWishlistType(record.entityType)) return null;
  if (typeof record.entityId !== "string" || !isUuid(record.entityId)) return null;
  return {
    entityType: record.entityType,
    entityId: record.entityId,
    note: typeof record.note === "string" ? record.note : "",
    savedAt: typeof record.savedAt === "string" ? record.savedAt : new Date(0).toISOString(),
  };
}

export function readWishlist(): WishlistDraft[] {
  const value = readJson(wishlistKey);
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const draft = draftFrom(item);
    return draft ? [draft] : [];
  });
}

export function writeWishlist(items: WishlistDraft[]): void {
  writeJson(wishlistKey, items.slice(0, anonymousWishlistLimit));
}

export function saveLocalWishlist(
  entityType: WishlistEntityType,
  entityId: string,
): { items: WishlistDraft[]; error?: string } {
  const result = addWishlistItem(readWishlist(), {
    entityType,
    entityId,
    note: "",
    savedAt: new Date().toISOString(),
  });
  if (!result.error) writeWishlist(result.items);
  return result;
}

export function removeLocalWishlist(entityType: WishlistEntityType, entityId: string): void {
  writeWishlist(
    readWishlist().filter((item) => item.entityType !== entityType || item.entityId !== entityId),
  );
}

export function noteLocalWishlist(
  entityType: WishlistEntityType,
  entityId: string,
  note: string,
): void {
  writeWishlist(
    readWishlist().map((item) =>
      item.entityType === entityType && item.entityId === entityId
        ? { ...item, note: clipNote(note) }
        : item,
    ),
  );
}

export function clearWishlist(): void {
  writeWishlist([]);
}

export function readCompareIds(): string[] {
  const value = readJson(compareKey);
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && isUuid(item))
    .slice(0, compareLimit);
}

export function writeCompareIds(ids: string[]): void {
  writeJson(compareKey, ids.filter((id) => isUuid(id)).slice(0, compareLimit));
}

export function saveLocalCompare(id: string): { ids: string[]; error?: string } {
  const result = addCompareId(readCompareIds(), id);
  if (!result.error) writeCompareIds(result.ids);
  return result;
}

export function removeLocalCompare(id: string): void {
  writeCompareIds(readCompareIds().filter((item) => item !== id));
}

function recentFrom(value: unknown): RecentDraft | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.entityType !== "string" || !isViewType(record.entityType)) return null;
  if (typeof record.entityId !== "string" || !isUuid(record.entityId)) return null;
  return {
    entityType: record.entityType,
    entityId: record.entityId,
    viewedAt: typeof record.viewedAt === "string" ? record.viewedAt : new Date(0).toISOString(),
  };
}

export function readRecent(): RecentDraft[] {
  const value = readJson(recentKey);
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const draft = recentFrom(item);
    return draft ? [draft] : [];
  });
}

export function rememberLocalView(
  entityType: ViewEntityType,
  entityId: string,
  limit: number,
): void {
  writeJson(
    recentKey,
    rememberView(readRecent(), { entityType, entityId, viewedAt: new Date().toISOString() }, limit),
  );
}

export { compareLimit };
