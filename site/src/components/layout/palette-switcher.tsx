"use client";

import { useEffect, useState } from "react";
import { Check, Palette, X } from "lucide-react";

export type PaletteId = "ocean" | "sunset" | "midnight" | "daylight" | "reef" | "palm";

interface PaletteOption {
  id: PaletteId;
  name: string;
  tagline: string;
  ocean: string;
  accent: string;
  sand: string;
}

const PALETTES: PaletteOption[] = [
  {
    id: "ocean",
    name: "Ocean & Coral",
    tagline: "Classic Maldives Brand",
    ocean: "#083b4c",
    accent: "#ff6f59",
    sand: "#faf8f3",
  },
  {
    id: "sunset",
    name: "Sunset Atoll",
    tagline: "Warm Dusk & Papaya",
    ocean: "#1b2a4e",
    accent: "#ffa14a",
    sand: "#fcf7ef",
  },
  {
    id: "midnight",
    name: "Midnight Resort",
    tagline: "Ultra-Luxury & Champagne",
    ocean: "#0b1f33",
    accent: "#e2b45f",
    sand: "#f6f7f8",
  },
  {
    id: "daylight",
    name: "Lagoon Daylight",
    tagline: "Bright Teal & Coral",
    ocean: "#0a4a5c",
    accent: "#ff7a5c",
    sand: "#fbfcfb",
  },
  {
    id: "reef",
    name: "Coral Reef",
    tagline: "Deep Sea & Hibiscus",
    ocean: "#0a3d3f",
    accent: "#ff7f9c",
    sand: "#faf8f4",
  },
  {
    id: "palm",
    name: "Tropical Palm",
    tagline: "Lush Eco-Green & Sun",
    ocean: "#12372a",
    accent: "#ffc233",
    sand: "#f9f7ee",
  },
];

export function PaletteSwitcher() {
  const [activePalette, setActivePalette] = useState<PaletteId>("ocean");
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("mdv-palette") as PaletteId | null;
    if (saved && PALETTES.some((p) => p.id === saved)) {
      setActivePalette(saved);
      document.documentElement.setAttribute("data-palette", saved);
    }
  }, []);

  const handleSelect = (id: PaletteId) => {
    setActivePalette(id);
    document.documentElement.setAttribute("data-palette", id);
    try {
      localStorage.setItem("mdv-palette", id);
    } catch {
      // storage unavailable
    }
  };

  if (!mounted) return null;

  const current = PALETTES.find((p) => p.id === activePalette) ?? PALETTES[0]!;

  return (
    <aside aria-label="Design Palette Switcher" className="fixed bottom-20 right-3 z-40 sm:right-6 lg:bottom-6">
      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Select website color palette"
          className="animate-in fade-in slide-in-from-bottom-2 mb-3 max-h-[75vh] w-[calc(100vw-2rem)] max-w-xs overflow-y-auto rounded-2xl border border-border-subtle bg-white p-4 shadow-3 backdrop-blur-md sm:w-80"
        >
          <div className="mb-3 flex items-center justify-between border-b border-border-subtle pb-2">
            <div className="flex items-center gap-2">
              <Palette size={18} className="text-lagoon-ink" aria-hidden="true" />
              <span className="text-sm font-bold text-ocean">Design Palettes</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-muted hover:bg-mist hover:text-ink"
              aria-label="Close palette selector"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <p className="mb-3 text-xs text-muted">
            All 6 design directions pass WCAG AA contrast standards. Click to preview live:
          </p>

          <div className="grid gap-2">
            {PALETTES.map((palette) => {
              const isSelected = activePalette === palette.id;
              return (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => handleSelect(palette.id)}
                  className={`flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-all ${
                    isSelected
                      ? "border border-lagoon-ink bg-mist/60 ring-1 ring-lagoon-ink"
                      : "border border-transparent hover:border-border-subtle hover:bg-sand"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1">
                      <span
                        className="inline-block h-5 w-5 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: palette.ocean }}
                        title="Primary ocean"
                      />
                      <span
                        className="inline-block h-5 w-5 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: palette.accent }}
                        title="Accent action"
                      />
                      <span
                        className="inline-block h-5 w-5 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: palette.sand }}
                        title="Background sand"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink leading-tight">{palette.name}</p>
                      <p className="text-xs text-muted leading-tight">{palette.tagline}</p>
                    </div>
                  </div>
                  {isSelected ? (
                    <Check size={16} className="text-lagoon-ink" aria-hidden="true" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="group flex items-center gap-2.5 rounded-full border border-border/80 bg-white/95 px-4 py-2.5 text-sm font-semibold text-ocean shadow-2 backdrop-blur hover:border-ocean hover:bg-white active:scale-95 transition-all"
      >
        <span
          className="inline-block h-3.5 w-3.5 rounded-full shadow-sm ring-1 ring-black/10"
          style={{ backgroundColor: current.accent }}
        />
        <span className="hidden sm:inline">{current.name}</span>
        <span className="text-xs text-muted font-normal">Theme</span>
        <Palette size={16} className="text-lagoon-ink transition-transform group-hover:rotate-12" aria-hidden="true" />
      </button>
    </aside>
  );
}
