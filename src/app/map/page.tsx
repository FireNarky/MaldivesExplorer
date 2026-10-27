import type { Metadata } from "next";
import Link from "next/link";
import { Plane, Compass, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { Archipelago3DMap } from "@/components/map/archipelago-3d-map";
import { publicMetadata } from "@/lib/seo/metadata";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = publicMetadata({
  title: "Interactive 3D Maldives Archipelago & Resort Map",
  description:
    "Explore 26 natural geographic atolls, luxury private island sanctuaries, and seaplane transfer corridors in an interactive 3D perspective.",
  path: "/map",
});

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ resort?: string }>;
}) {
  const { resort } = await searchParams;

  return (
    <div className="space-y-8 py-2 sm:py-6 animate-in fade-in duration-300">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "3D Archipelago Map" }]} />

      {/* Clean Minimal Page Header */}
      <div className="space-y-2 max-w-2xl">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">
          <Compass size={13} />
          Geographic Bathymetry &amp; Transfer Corridors
        </span>
        <h1 className="text-3xl sm:text-4xl font-display font-medium text-ocean dark:text-cyan-200">
          Maldivian Archipelago Map
        </h1>
        <p className="text-sm sm:text-base text-muted dark:text-slate-300 font-light leading-relaxed">
          Orbit and explore 26 natural atolls spanning 820 kilometers across the equator. Tap any sanctuary beacon to preview seaplane transfer times and island highlights.
        </p>
      </div>

      {/* 3D Map Component */}
      <section aria-label="3D Archipelago Explorer" className="w-full">
        <Archipelago3DMap initialResortSlug={resort} />
      </section>

      {/* Subtle Geographic Transfer Notes */}
      <div className="grid gap-4 sm:grid-cols-3 pt-2">
        <div className="rounded-2xl border border-border-subtle bg-white dark:bg-white/5 p-4 space-y-1">
          <span className="text-xs font-semibold text-ocean dark:text-cyan-300 flex items-center gap-1.5">
            <Plane size={13} /> TMA Seaplane Corridors
          </span>
          <p className="text-xs text-muted dark:text-slate-400 leading-relaxed font-light">
            30–45 minute scenic flights from Velana Airport (MLE) connecting northern atolls like Noonu, Baa, and Lhaviyani.
          </p>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-white dark:bg-white/5 p-4 space-y-1">
          <span className="text-xs font-semibold text-ocean dark:text-cyan-300 flex items-center gap-1.5">
            <Sparkles size={13} /> Speedboat &amp; Luxury Yacht
          </span>
          <p className="text-xs text-muted dark:text-slate-400 leading-relaxed font-light">
            20–45 minute private speedboat and yacht arrivals connecting North and South Malé atoll sanctuaries day and night.
          </p>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-white dark:bg-white/5 p-4 space-y-1 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-ocean dark:text-cyan-300">
              Need Transfer Guidance?
            </span>
            <p className="text-xs text-muted dark:text-slate-400 leading-relaxed font-light">
              Our specialists coordinate bespoke flight connections and resort combinations.
            </p>
          </div>
          <div className="pt-2">
            <Button asChild variant="secondary" className="w-full rounded-full py-1.5 text-xs font-semibold">
              <Link href="/contact">Inquire with a Specialist</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
