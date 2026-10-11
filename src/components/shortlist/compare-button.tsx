"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { readCompareIds, removeLocalCompare, saveLocalCompare } from "@/lib/shortlist/local";
import { compareLimit } from "@/modules/wishlist/rules";

export function CompareButton({ resortId }: { resortId: string }) {
  const [ids, setIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const selected = ids.includes(resortId);
  const full = ids.length >= compareLimit;

  useEffect(() => {
    setIds(readCompareIds());
  }, []);

  function onClick() {
    if (selected) {
      removeLocalCompare(resortId);
      setIds(readCompareIds());
      setMessage("Removed from compare.");
      return;
    }
    const result = saveLocalCompare(resortId);
    setIds(result.ids);
    setMessage(result.error ?? "Added to compare.");
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        aria-pressed={selected}
        disabled={full && !selected}
        aria-describedby={full && !selected ? `compare-limit-${resortId}` : undefined}
        onClick={onClick}
      >
        {selected ? "In compare" : "Compare"}
      </Button>
      {full && !selected ? <p id={`compare-limit-${resortId}`}>Compare holds 3 resorts.</p> : null}
      {ids.length > 0 ? (
        <Link href={`/compare?ids=${ids.join(",")}`} className="text-lagoon-ink">
          Open compare
        </Link>
      ) : null}
      <p role="status">{message}</p>
    </div>
  );
}
