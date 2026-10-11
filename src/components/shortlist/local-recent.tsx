"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { readRecent } from "@/lib/shortlist/local";

type Card = {
  entityType: string;
  entityId: string;
  available: boolean;
  name: string | null;
  href: string | null;
  summary: string | null;
};

export function LocalRecent({ limit }: { limit: number }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    const items = readRecent().slice(0, limit);
    if (items.length === 0) {
      setEmpty(true);
      return;
    }
    void fetch("/api/shortlist/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Recently viewed listings could not be loaded.");
        const payload = (await response.json()) as { items?: Card[] };
        setCards(payload.items ?? []);
      })
      .catch(() => setEmpty(true));
  }, [limit]);

  if (empty) {
    return (
      <EmptyState title="Recently viewed">
        <p>Nothing has been viewed on this device.</p>
      </EmptyState>
    );
  }

  return (
    <ul className="grid gap-4">
      {cards.map((card) => (
        <li key={`${card.entityType}:${card.entityId}`} className="grid max-w-[65ch] gap-1">
          {card.available && card.href && card.name ? (
            <Link href={card.href} className="text-lagoon-ink">
              {card.name}
            </Link>
          ) : (
            <p>This listing is not currently published.</p>
          )}
          {card.summary ? <p>{card.summary}</p> : null}
        </li>
      ))}
    </ul>
  );
}
