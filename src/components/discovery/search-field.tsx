"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { runSearch } from "@/modules/search/actions";
import type { SearchSuggestion } from "@/modules/search/query";

const kindLabel: Record<SearchSuggestion["kind"], string> = {
  resorts: "Resort",
  atolls: "Atoll",
  islands: "Island",
  experiences: "Experience",
  guides: "Guide",
  collections: "Collection",
};

export function SearchField({ initialQuery }: { initialQuery: string }) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [note, setNote] = useState("");

  function schedule(value: string) {
    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setNote("");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Suggestions could not be loaded.");
          const payload = (await response.json()) as { suggestions?: SearchSuggestion[] };
          setSuggestions(payload.suggestions ?? []);
          setNote(payload.suggestions?.length ? "" : "No published names are similar.");
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setSuggestions([]);
          setNote("Suggestions could not be loaded.");
        });
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }

  return (
    <form action={runSearch} className="grid gap-3" role="search">
      <label htmlFor="search-query">Search published pages</label>
      <Input
        id="search-query"
        name="q"
        type="search"
        defaultValue={initialQuery}
        autoComplete="off"
        onChange={(event) => {
          schedule(event.target.value);
        }}
      />
      <Button type="submit">Search</Button>
      <p role="status">{note}</p>
      {suggestions.length > 0 ? (
        <ul aria-label="Suggestions" className="grid gap-2">
          {suggestions.map((item) => (
            <li key={`${item.kind}-${item.href}`}>
              <Link href={item.href} className="text-lagoon-ink">
                {item.label}
              </Link>
              <span> {kindLabel[item.kind]}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
