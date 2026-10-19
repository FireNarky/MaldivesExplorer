"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearWishlist, readWishlist, rememberLocalView } from "@/lib/shortlist/local";
import { mergeWishlistAction } from "@/modules/wishlist/actions";
import type { ViewEntityType } from "@/modules/wishlist/rules";

export function WishlistMerge({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!signedIn) return;
    const items = readWishlist();
    if (items.length === 0) return;
    void mergeWishlistAction(items)
      .then(() => {
        clearWishlist();
        router.refresh();
      })
      .catch(() => undefined);
  }, [router, signedIn]);
  return null;
}

export function RememberView({
  entityType,
  entityId,
  limit,
}: {
  entityType: ViewEntityType;
  entityId: string;
  limit: number;
}) {
  useEffect(() => {
    rememberLocalView(entityType, entityId, limit);
  }, [entityId, entityType, limit]);
  return null;
}
