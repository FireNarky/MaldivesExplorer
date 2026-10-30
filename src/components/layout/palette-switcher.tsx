"use client";

import { useEffect, useRef, useState } from "react";
import { Check, GripVertical, Laptop, Moon, Palette, RotateCcw, Sun, X } from "lucide-react";
import { trapFocusKeydown } from "@/lib/a11y/focus-trap";

export type PaletteId =
  "ocean" | "sunset" | "midnight" | "daylight" | "reef" | "palm" | "twilight" | "bioluminescence";

export type ThemeMode = "light" | "dark" | "system";

interface PaletteOption {
  id: PaletteId;
  name: string;
  tagline: string;
  ocean: string;
  accent: string;
  sand: string;
  darkOcean: string;
  darkAccent: string;
}

const PALETTES: PaletteOption[] = [
  {
    id: "ocean",
    name: "Ocean & Coral",
    tagline: "Classic Maldives Brand",
    ocean: "#083b4c",
    accent: "#ff6f59",
    sand: "#faf8f3",
    darkOcean: "#67e8f9",
    darkAccent: "#fb7185",
  },
  {
    id: "sunset",
    name: "Sunset Atoll",
    tagline: "Warm Dusk & Papaya",
    ocean: "#1b2a4e",
    accent: "#ffa14a",
    sand: "#fcf7ef",
    darkOcean: "#fed7aa",
    darkAccent: "#fb923c",
  },
  {
    id: "midnight",
    name: "Midnight Resort",
    tagline: "Ultra-Luxury & Champagne",
    ocean: "#0b1f33",
    accent: "#e2b45f",
    sand: "#f6f7f8",
    darkOcean: "#fef08a",
    darkAccent: "#818cf8",
  },
  {
    id: "daylight",
    name: "Lagoon Daylight",
    tagline: "Bright Teal & Coral",
    ocean: "#0a4a5c",
    accent: "#ff7a5c",
    sand: "#fbfcfb",
    darkOcean: "#a5f3fc",
    darkAccent: "#22d3ee",
  },
  {
    id: "reef",
    name: "Coral Reef",
    tagline: "Deep Sea & Hibiscus",
    ocean: "#0a3d3f",
    accent: "#ff7f9c",
    sand: "#faf8f4",
    darkOcean: "#99f6e4",
    darkAccent: "#f472b6",
  },
  {
    id: "palm",
    name: "Tropical Palm",
    tagline: "Lush Eco-Green & Sun",
    ocean: "#12372a",
    accent: "#ffc233",
    sand: "#f9f7ee",
    darkOcean: "#a7f3d0",
    darkAccent: "#34d399",
  },
  {
    id: "twilight",
    name: "Twilight Atoll",
    tagline: "Island Dusk & Violet Horizon",
    ocean: "#2e1065",
    accent: "#a855f7",
    sand: "#faf5ff",
    darkOcean: "#e9d5ff",
    darkAccent: "#c084fc",
  },
  {
    id: "bioluminescence",
    name: "Bioluminescent Bay",
    tagline: "Deep Ocean & Electric Cyan",
    ocean: "#042f2e",
    accent: "#14b8a6",
    sand: "#f0fdfa",
    darkOcean: "#5eead4",
    darkAccent: "#2dd4bf",
  },
];

function getResolvedMode(mode: ThemeMode): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(mode: ThemeMode, palette: PaletteId) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  const isDark = getResolvedMode(mode) === "dark";

  if (isDark) {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  } else {
    root.classList.remove("dark");
    root.removeAttribute("data-theme");
  }

  root.setAttribute("data-palette", palette);
}

export function PaletteSwitcher() {
  const [activePalette, setActivePalette] = useState<PaletteId>("ocean");
  const [mode, setMode] = useState<ThemeMode>("system");
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [customPos, setCustomPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        openButtonRef.current?.focus();
        return;
      }
      if (panelRef.current) trapFocusKeydown(event, panelRef.current);
    };
    document.addEventListener("keydown", onKey);
    const first = panelRef.current?.querySelector<HTMLElement>(
      'button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  useEffect(() => {
    setMounted(true);
    try {
      const savedPalette = localStorage.getItem("mdv-palette") as PaletteId | null;
      const savedMode = localStorage.getItem("mdv-mode") as ThemeMode | null;
      const savedPos = localStorage.getItem("mdv-theme-pos");

      const p =
        savedPalette && PALETTES.some((item) => item.id === savedPalette) ? savedPalette : "ocean";
      const m = savedMode && ["light", "dark", "system"].includes(savedMode) ? savedMode : "system";

      setActivePalette(p);
      setMode(m);
      applyTheme(m, p);

      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        if (
          typeof parsed.x === "number" &&
          typeof parsed.y === "number" &&
          parsed.x >= 0 &&
          parsed.x < window.innerWidth &&
          parsed.y >= 0 &&
          parsed.y < window.innerHeight
        ) {
          setCustomPos(parsed);
        }
      }
    } catch {}

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMedia = () => {
      const currentMode = (localStorage.getItem("mdv-mode") as ThemeMode) || "system";
      if (currentMode === "system") {
        const curPalette = (localStorage.getItem("mdv-palette") as PaletteId) || "ocean";
        applyTheme("system", curPalette);
      }
    };
    mql.addEventListener("change", handleMedia);
    return () => mql.removeEventListener("change", handleMedia);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const container = containerRef.current;
    if (!container) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const rect = container.getBoundingClientRect();
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;

    let hasMoved = false;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = Math.abs(moveEvent.clientX - startX);
      const dy = Math.abs(moveEvent.clientY - startY);
      if (dx > 4 || dy > 4) {
        hasMoved = true;
        isDraggingRef.current = true;
      }
      if (!hasMoved) return;

      const newX = Math.max(
        12,
        Math.min(window.innerWidth - rect.width - 12, moveEvent.clientX - offsetX),
      );
      const newY = Math.max(
        64,
        Math.min(window.innerHeight - rect.height - 12, moveEvent.clientY - offsetY),
      );
      setCustomPos({ x: newX, y: newY });
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      if (hasMoved) {
        const finalX = Math.max(
          12,
          Math.min(window.innerWidth - rect.width - 12, upEvent.clientX - offsetX),
        );
        const finalY = Math.max(
          64,
          Math.min(window.innerHeight - rect.height - 12, upEvent.clientY - offsetY),
        );
        const pos = { x: finalX, y: finalY };
        setCustomPos(pos);
        try {
          localStorage.setItem("mdv-theme-pos", JSON.stringify(pos));
        } catch {}
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 80);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleResetPosition = () => {
    setCustomPos(null);
    try {
      localStorage.removeItem("mdv-theme-pos");
    } catch {}
  };

  const handleSelectPalette = (id: PaletteId) => {
    setActivePalette(id);
    applyTheme(mode, id);
    try {
      localStorage.setItem("mdv-palette", id);
    } catch {}
  };

  const handleSelectMode = (newMode: ThemeMode) => {
    setMode(newMode);
    applyTheme(newMode, activePalette);
    try {
      localStorage.setItem("mdv-mode", newMode);
    } catch {}
  };

  const handleToggleMode = () => {
    const resolved = getResolvedMode(mode);
    const nextMode = resolved === "dark" ? "light" : "dark";
    handleSelectMode(nextMode);
  };

  if (!mounted) return null;

  const current = PALETTES.find((p) => p.id === activePalette) ?? PALETTES[0]!;
  const isDark = getResolvedMode(mode) === "dark";
  const isTopHalf = customPos !== null && customPos.y < 380;
  const isRightSide =
    customPos !== null && typeof window !== "undefined" && customPos.x > window.innerWidth - 380;

  return (
    <aside
      ref={containerRef}
      aria-label="Design Palette & Theme Switcher"
      style={
        customPos
          ? {
              left: `${customPos.x}px`,
              top: `${customPos.y}px`,
              right: "auto",
              bottom: "auto",
            }
          : undefined
      }
      className={`hidden lg:block fixed z-40 select-none ${
        customPos ? "" : "left-6 bottom-[calc(1.5rem+var(--me-compare-tray-h,0px))]"
      }`}
    >
      {isOpen ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Select website theme and palette"
          className={`animate-in fade-in max-h-[82vh] w-[calc(100vw-2rem)] max-w-sm overflow-y-auto rounded-2xl border border-border-subtle bg-white dark:bg-[#0c1a20] dark:border-white/15 p-4 shadow-3 backdrop-blur-md sm:w-88 absolute ${
            isTopHalf ? "top-full mt-3" : "bottom-full mb-3"
          } ${isRightSide ? "right-0" : "left-0"}`}
        >
          <div className="mb-3 flex items-center justify-between border-b border-border-subtle dark:border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Palette
                size={18}
                className="text-lagoon-ink dark:text-cyan-400"
                aria-hidden="true"
              />
              <span className="text-sm font-bold text-ocean dark:text-cyan-300">
                Theme &amp; Palettes
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {customPos ? (
                <button
                  type="button"
                  onClick={handleResetPosition}
                  title="Reset theme float to bottom-left default"
                  className="inline-flex items-center gap-1 rounded-lg border border-border-subtle dark:border-white/10 px-2 py-1 text-[11px] font-semibold text-muted hover:text-ink dark:hover:text-white hover:bg-mist dark:hover:bg-white/10 transition-colors"
                >
                  <RotateCcw size={11} />
                  <span>Dock Left</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  openButtonRef.current?.focus();
                }}
                className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-mist dark:hover:bg-white/10 hover:text-ink dark:hover:text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                aria-label="Close palette selector"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-semibold text-muted dark:text-slate-300">
              Display Mode
            </p>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border-subtle dark:border-white/10 bg-sand/60 dark:bg-white/5 p-1">
              <button
                type="button"
                onClick={() => handleSelectMode("light")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
                  mode === "light"
                    ? "bg-white text-ink shadow-sm"
                    : "text-muted hover:text-ink dark:hover:text-white"
                }`}
              >
                <Sun size={13} className="text-amber-500" />
                Light
              </button>
              <button
                type="button"
                onClick={() => handleSelectMode("dark")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
                  mode === "dark"
                    ? "bg-white dark:bg-white/20 text-ink dark:text-white shadow-sm"
                    : "text-muted hover:text-ink dark:hover:text-white"
                }`}
              >
                <Moon size={13} className="text-indigo-400" />
                Dark
              </button>
              <button
                type="button"
                onClick={() => handleSelectMode("system")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
                  mode === "system"
                    ? "bg-white dark:bg-white/20 text-ink dark:text-white shadow-sm"
                    : "text-muted hover:text-ink dark:hover:text-white"
                }`}
              >
                <Laptop size={13} />
                System
              </button>
            </div>
          </div>

          <p className="mb-2 text-xs font-semibold text-muted dark:text-slate-300">
            Maldives Color Palettes (WCAG AA compliant)
          </p>

          <div className="grid gap-1.5">
            {PALETTES.map((palette) => {
              const isSelected = activePalette === palette.id;
              return (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => handleSelectPalette(palette.id)}
                  className={`flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-all ${
                    isSelected
                      ? "border border-lagoon-ink bg-mist/60 dark:bg-white/10 ring-1 ring-lagoon-ink"
                      : "border border-transparent hover:border-border-subtle dark:hover:border-white/15 hover:bg-sand dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1">
                      <span
                        className="inline-block h-5 w-5 rounded-full border border-white/60 shadow-sm"
                        style={{ backgroundColor: isDark ? palette.darkOcean : palette.ocean }}
                        title="Primary color"
                      />
                      <span
                        className="inline-block h-5 w-5 rounded-full border border-white/60 shadow-sm"
                        style={{ backgroundColor: isDark ? palette.darkAccent : palette.accent }}
                        title="Accent action"
                      />
                      <span
                        className="inline-block h-5 w-5 rounded-full border border-white/60 shadow-sm"
                        style={{ backgroundColor: palette.sand }}
                        title="Background tone"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink dark:text-white leading-tight">
                        {palette.name}
                      </p>
                      <p className="text-xs text-muted dark:text-slate-300 leading-tight">
                        {palette.tagline}
                      </p>
                    </div>
                  </div>
                  {isSelected ? (
                    <Check
                      size={16}
                      className="text-lagoon-ink dark:text-cyan-400"
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2 text-[11px] text-muted dark:text-slate-400 border-t border-border-subtle dark:border-white/10 flex items-center gap-1.5">
            <GripVertical size={13} className="shrink-0 text-muted/70" />
            <span>Drag the grip handle to move this theme float anywhere.</span>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onPointerDown={handlePointerDown}
          title="Drag to reposition theme float"
          aria-label="Drag to reposition theme switcher"
          className="cursor-grab active:cursor-grabbing touch-none flex size-11 items-center justify-center rounded-full border border-border/80 dark:border-white/20 bg-white/95 dark:bg-[#0c1a20]/95 text-muted hover:text-ink dark:hover:text-white shadow-2 backdrop-blur transition hover:border-ocean dark:hover:border-cyan-400 hover:bg-white dark:hover:bg-[#11232b] active:scale-95"
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleToggleMode}
          title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
          className="flex size-11 items-center justify-center rounded-full border border-border/80 dark:border-white/20 bg-white/95 dark:bg-[#0c1a20]/95 text-ink dark:text-white shadow-2 backdrop-blur transition hover:border-ocean dark:hover:border-cyan-400 hover:bg-white dark:hover:bg-[#11232b] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          aria-label="Toggle dark and light mode"
        >
          {isDark ? (
            <Sun
              size={17}
              className="text-amber-400 rotate-0 transition-transform hover:rotate-45"
            />
          ) : (
            <Moon size={17} className="text-slate-700 -rotate-12 transition-transform" />
          )}
        </button>

        <button
          ref={openButtonRef}
          type="button"
          onClick={() => {
            if (isDraggingRef.current) return;
            setIsOpen(!isOpen);
          }}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="group flex min-h-11 items-center gap-2 rounded-full border border-border/80 dark:border-white/20 bg-white/95 dark:bg-[#0c1a20]/95 px-3.5 py-2.5 text-sm font-semibold text-ocean dark:text-cyan-300 shadow-2 backdrop-blur hover:border-ocean dark:hover:border-cyan-400 hover:bg-white dark:hover:bg-[#11232b] active:scale-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <span
            className="inline-block h-3.5 w-3.5 rounded-full shadow-sm ring-1 ring-black/10"
            style={{ backgroundColor: isDark ? current.darkAccent : current.accent }}
          />
          <span className="hidden sm:inline">{current.name}</span>
          <span className="text-xs text-muted font-normal">Theme</span>
          <Palette
            size={15}
            className="text-lagoon-ink transition-transform group-hover:rotate-12"
            aria-hidden="true"
          />
        </button>
      </div>
    </aside>
  );
}
