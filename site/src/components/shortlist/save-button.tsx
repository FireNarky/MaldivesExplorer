"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { readWishlist, removeLocalWishlist, saveLocalWishlist } from "@/lib/shortlist/local";
import { toggleListingAction } from "@/modules/wishlist/actions";
import type { WishlistEntityType } from "@/modules/wishlist/rules";

export function SaveButton({
  entityType,
  entityId,
  signedIn,
  initiallySaved = false,
}: {
  entityType: WishlistEntityType;
  entityId: string;
  signedIn: boolean;
  initiallySaved?: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (signedIn) return;
    setSaved(
      readWishlist().some((item) => item.entityType === entityType && item.entityId === entityId),
    );
  }, [entityId, entityType, signedIn]);

  async function onClick() {
    if (!signedIn) {
      if (saved) {
        removeLocalWishlist(entityType, entityId);
        setSaved(false);
        setMessage("Removed from this device.");
        return;
      }
      const result = saveLocalWishlist(entityType, entityId);
      setSaved(!result.error);
      setMessage(result.error ?? "Saved on this device.");
      return;
    }
    try {
      const next = await toggleListingAction(entityType, entityId);
      setSaved(next);
      setMessage(next ? "Saved to your account." : "Removed from your account.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The listing could not be saved.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant={saved ? "secondary" : "primary"}
        aria-pressed={saved}
        onClick={() => void onClick()}
      >
        {saved ? "Saved" : "Save"}
      </Button>
      <p role="status">{message}</p>
    </div>
  );
}
