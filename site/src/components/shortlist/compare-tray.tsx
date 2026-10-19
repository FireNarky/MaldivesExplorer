"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readCompareIds, removeLocalCompare, shortlistChanged } from "@/lib/shortlist/local";
import { compareLimit } from "@/modules/wishlist/rules";

export function CompareTray() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const refresh = () => setIds(readCompareIds());
    refresh();
    window.addEventListener(shortlistChanged, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(shortlistChanged, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (ids.length === 0) return null;
  return (
    <aside
      aria-label="Compare"
      className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 border-t lg:bottom-0 border-border-subtle bg-white"
    >
      <div className="mx-auto flex w-full max-w-[90rem] flex-wrap items-center gap-3 px-4 py-3 lg:px-8">
        <p>
          {ids.length} of {compareLimit} resorts
        </p>
        {ids.length >= compareLimit ? <p>Compare holds 3 resorts.</p> : null}
        <Link href={`/compare?ids=${ids.join(",")}`} className="text-lagoon-ink">
          Compare resorts
        </Link>
        <button
          type="button"
          className="min-h-11 text-lagoon-ink"
          onClick={() => {
            for (const id of ids) removeLocalCompare(id);
            setIds([]);
          }}
        >
          Clear compare
        </button>
      </div>
    </aside>
  );
}
