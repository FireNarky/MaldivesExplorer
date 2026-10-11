"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  noteLocalWishlist,
  readWishlist,
  removeLocalWishlist,
  shortlistChanged,
} from "@/lib/shortlist/local";
import { wishlistNoteLimit, type WishlistDraft } from "@/modules/wishlist/rules";

type Card = {
  entityType: string;
  entityId: string;
  available: boolean;
  name: string | null;
  href: string | null;
  summary: string | null;
};

export function LocalWishlist() {
  const [items, setItems] = useState<WishlistDraft[]>([]);
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    const refresh = () => setItems(readWishlist());
    refresh();
    window.addEventListener(shortlistChanged, refresh);
    return () => window.removeEventListener(shortlistChanged, refresh);
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      setCards([]);
      return;
    }
    void fetch("/api/shortlist/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("The saved list could not be loaded.");
        const payload = (await response.json()) as { items?: Card[] };
        setCards(payload.items ?? []);
      })
      .catch(() => setCards([]));
  }, [items]);

  if (items.length === 0) {
    return (
      <EmptyState title="Saved items">
        <p>Nothing is saved on this device.</p>
        <Link href="/resorts" className="text-lagoon-ink">
          Resorts
        </Link>
      </EmptyState>
    );
  }

  return (
    <ul className="grid gap-6">
      {items.map((item) => {
        const card = cards.find(
          (entry) => entry.entityType === item.entityType && entry.entityId === item.entityId,
        );
        return (
          <li key={`${item.entityType}:${item.entityId}`} className="grid max-w-[65ch] gap-3">
            {card?.available && card.href ? (
              <Link href={card.href} className="text-lagoon-ink">
                {card.name}
              </Link>
            ) : card?.available && card.name ? (
              <p>{card.name}</p>
            ) : (
              <p>This listing is not currently published.</p>
            )}
            {card?.summary ? <p>{card.summary}</p> : null}
            <form
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                noteLocalWishlist(item.entityType, item.entityId, String(data.get("note") ?? ""));
                setItems(readWishlist());
              }}
            >
              <Label htmlFor={`note-${item.entityId}`}>
                Note <span className="font-normal">Optional</span>
              </Label>
              <Textarea
                id={`note-${item.entityId}`}
                name="note"
                maxLength={wishlistNoteLimit}
                defaultValue={item.note}
              />
              <Button type="submit" variant="secondary">
                Save note
              </Button>
            </form>
            <Button
              type="button"
              variant="secondary"
              onClick={() => removeLocalWishlist(item.entityType, item.entityId)}
            >
              Remove
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
