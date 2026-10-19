"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, FileText, MapPin, Search, Sparkles, Waves, X } from "lucide-react";

interface Suggestion {
  title: string;
  href: string;
  kind: "resort" | "atoll" | "island" | "experience" | "article" | "offer";
}

const QUICK_LINKS: Suggestion[] = [
  { title: "Soneva Jani", href: "/resorts/soneva-jani", kind: "resort" },
  { title: "Soneva Fushi", href: "/resorts/soneva-fushi", kind: "resort" },
  { title: "The Ritz-Carlton Maldives", href: "/resorts/the-ritz-carlton-maldives", kind: "resort" },
  { title: "Cheval Blanc Randheli", href: "/resorts/cheval-blanc-randheli", kind: "resort" },
  { title: "Baa Atoll (UNESCO Biosphere)", href: "/atolls/baa-atoll", kind: "atoll" },
  { title: "Manta Rays in Hanifaru Bay", href: "/experiences/hanifaru-bay-manta-snorkeling", kind: "experience" },
  { title: "First-Timer's Guide to the Maldives", href: "/guides/first-timers-guide-to-the-maldives", kind: "article" },
];

export function QuickSearchDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Keyboard shortcut listener (/ or Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement))
      ) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Live search query
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.suggestions ?? []);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const getIcon = (kind: string) => {
    switch (kind) {
      case "resort":
        return <Waves size={16} className="text-lagoon-ink" aria-hidden="true" />;
      case "atoll":
      case "island":
        return <MapPin size={16} className="text-lagoon-ink" aria-hidden="true" />;
      case "experience":
        return <Compass size={16} className="text-lagoon-ink" aria-hidden="true" />;
      case "article":
        return <FileText size={16} className="text-lagoon-ink" aria-hidden="true" />;
      default:
        return <Sparkles size={16} className="text-lagoon-ink" aria-hidden="true" />;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Search site (Press / or Cmd+K)"
        className="inline-flex size-11 items-center justify-center rounded-md text-ink hover:bg-mist transition-colors"
      >
        <Search aria-hidden="true" size={20} strokeWidth={1.75} />
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Quick Search"
          className="fixed inset-0 z-50 flex items-start justify-center bg-ocean/40 p-3 pt-6 backdrop-blur-sm sm:p-4 sm:pt-24 animate-in fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-3 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="relative flex items-center border-b border-border-subtle px-4 py-3">
              <Search size={20} className="text-muted mr-3 shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search resorts, atolls, experiences, guides..."
                className="w-full bg-transparent text-base text-ink placeholder:text-muted focus:outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded-full p-1 text-muted hover:text-ink mr-2"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              ) : null}
              <kbd className="hidden sm:inline-block rounded border border-border-subtle bg-sand px-2 py-0.5 text-[11px] font-semibold text-muted">
                ESC
              </kbd>
            </div>

            {/* Results or Quick Links */}
            <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto p-3">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted">
                  <span className="spinner mr-2" />
                  Searching catalog...
                </div>
              ) : query.trim().length >= 2 ? (
                results.length > 0 ? (
                  <div className="grid gap-1">
                    <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                      Search Results ({results.length})
                    </p>
                    {results.map((item, index) => (
                      <button
                        key={`${item.href}-${index}`}
                        type="button"
                        onClick={() => handleSelect(item.href)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-ink hover:bg-mist transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {getIcon(item.kind)}
                          <span className="font-semibold">{item.title}</span>
                        </div>
                        <span className="text-xs uppercase tracking-wide text-muted font-medium">
                          {item.kind}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-muted">
                    <p>No results found for &ldquo;{query}&rdquo;</p>
                    <Link
                      href={`/search?q=${encodeURIComponent(query)}`}
                      onClick={() => setIsOpen(false)}
                      className="mt-2 inline-block font-semibold text-lagoon-ink hover:underline"
                    >
                      View full search page &rarr;
                    </Link>
                  </div>
                )
              ) : (
                <div className="grid gap-1">
                  <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted">
                    Popular Destinations & Resorts
                  </p>
                  {QUICK_LINKS.map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => handleSelect(item.href)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-mist transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getIcon(item.kind)}
                        <span>{item.title}</span>
                      </div>
                      <span className="text-xs uppercase tracking-wide text-muted">
                        {item.kind}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border-subtle bg-sand/60 px-4 py-2 text-xs text-muted">
              <span>Tip: press <kbd className="font-mono text-[10px] rounded bg-white px-1 py-0.5 border border-border-subtle">/</kbd> anywhere to open</span>
              <Link
                href="/search"
                onClick={() => setIsOpen(false)}
                className="font-semibold text-lagoon-ink hover:underline"
              >
                Advanced Search &rarr;
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
