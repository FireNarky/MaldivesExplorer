"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { readCompareIds, removeLocalCompare, shortlistChanged } from "@/lib/shortlist/local";
import { compareLimit } from "@/modules/wishlist/rules";

const TRAY_HEIGHT_VAR = "--me-compare-tray-h";

export function CompareTray() {
  const [ids, setIds] = useState<string[]>([]);
  const trayRef = useRef<HTMLElement>(null);

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

  useEffect(() => {
    const root = document.documentElement;
    if (ids.length === 0) {
      root.style.setProperty(TRAY_HEIGHT_VAR, "0px");
      return;
    }
    const el = trayRef.current;
    if (!el) return;
    const publish = () => {
      root.style.setProperty(TRAY_HEIGHT_VAR, `${el.getBoundingClientRect().height}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.setProperty(TRAY_HEIGHT_VAR, "0px");
    };
  }, [ids.length]);

  if (ids.length === 0) return null;
  return (
    <aside
      ref={trayRef}
      aria-label="Compare"
      className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t lg:bottom-0 border-border-subtle bg-white/95 dark:bg-[#071318]/95 dark:border-white/15 backdrop-blur-md shadow-2"
    >
      <div className="mx-auto flex w-full max-w-[90rem] 2xl:max-w-[105rem] 3xl:max-w-[115rem] flex-wrap items-center gap-4 px-4 py-3 lg:px-8 2xl:px-12 text-sm dark:text-white">
        <p className="font-semibold text-ocean dark:text-cyan-300">
          {ids.length} of {compareLimit} resorts
        </p>
        {ids.length >= compareLimit ? (
          <p className="text-xs text-muted">Compare holds 3 resorts.</p>
        ) : null}
        <Link
          href={`/compare?ids=${ids.join(",")}`}
          className="inline-flex min-h-11 items-center font-semibold text-lagoon-ink dark:text-cyan-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Compare resorts &rarr;
        </Link>
        <button
          type="button"
          className="ml-auto inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-sm text-muted hover:text-danger dark:hover:text-rose-400 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
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
