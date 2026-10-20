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
      className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 border-t lg:bottom-0 border-border-subtle bg-white/95 dark:bg-[#071318]/95 dark:border-white/15 backdrop-blur-md shadow-2"
    >
      <div className="mx-auto flex w-full max-w-[90rem] flex-wrap items-center gap-4 px-4 py-3 lg:px-8 text-sm dark:text-white">
        <p className="font-semibold text-ocean dark:text-cyan-300">
          {ids.length} of {compareLimit} resorts
        </p>
        {ids.length >= compareLimit ? <p className="text-xs text-muted">Compare holds 3 resorts.</p> : null}
        <Link href={`/compare?ids=${ids.join(",")}`} className="font-semibold text-lagoon-ink dark:text-cyan-400 hover:underline">
          Compare resorts &rarr;
        </Link>
        <button
          type="button"
          className="ml-auto min-h-9 text-xs text-muted hover:text-danger dark:hover:text-rose-400 transition"
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
