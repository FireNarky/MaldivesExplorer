import type { Metadata } from "next";
import Link from "next/link";
import { Compass, MapPin, Palmtree, Plane } from "lucide-react";
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
    <div className="space-y-10 py-2 sm:py-6 animate-in fade-in duration-500">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "3D Archipelago Map" }]} />

      {/* Header Info Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-[#083b4c]/95 via-[#083b4c] to-[#062936] dark:from-[#061d28] dark:via-[#082633] dark:to-[#041219] p-6 sm:p-10 text-white shadow-2">
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#2bbcd0_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-lagoon/20 blur-3xl" />

        <div className="relative max-w-3xl space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md border border-white/20">
            <Compass size={13} className="text-coral" />
            Geographic Bathymetry &amp; Flight Corridors
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-medium text-white leading-tight">
            Interactive 3D Maldivian Archipelago Map
          </h1>
          <p className="text-sm sm:text-base text-slate-200 font-light leading-relaxed">
            Orbit, tilt, and explore 26 natural geographic atolls spanning 820 kilometers across the Equator. Inspect real resort coordinates, scheduled seaplane trajectories from Velana Airport (MLE), and distinctive island geographies.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-300">
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
              <MapPin size={13} className="text-cyan-300" /> 26 Natural Atolls
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
              <Plane size={13} className="text-amber-300" /> TMA Seaplane Air Corridors
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
              <Palmtree size={13} className="text-emerald-300" /> 8 Verified Curated Sanctuaries
            </span>
          </div>
        </div>
      </div>

      {/* 3D Map Component */}
      <section aria-label="3D Archipelago Explorer" className="w-full">
        <Archipelago3DMap initialResortSlug={resort} />
      </section>

      {/* Key Atolls Quick Reference Grid */}
      <section className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">
              Archipelago Geography
            </p>
            <h2 className="text-2xl sm:text-3xl font-display text-ocean dark:text-cyan-200 mt-1">
              Featured Geographic Corridors
            </h2>
          </div>
          <Button asChild variant="secondary" className="self-start rounded-full px-5 py-2 text-xs font-semibold">
            <Link href="/destinations">Browse All Atolls &rarr;</Link>
          </Button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Noonu & Lhaviyani",
              coords: "5.88°N · Northern Atolls",
              desc: "Home to Soneva Jani's iconic overwater slides, Cheval Blanc Randheli, and Hurawalhi's 5.8 Undersea Restaurant.",
              transfer: "35–40 min TMA Seaplane",
              color: "border-cyan-500/30",
            },
            {
              title: "Baa Atoll (UNESCO)",
              coords: "5.13°N · World Biosphere",
              desc: "Protected marine reserve famous for Hanifaru Bay's world-record manta ray congregations and Soneva Fushi.",
              transfer: "30 min Seaplane",
              color: "border-emerald-500/30",
            },
            {
              title: "North & South Malé",
              coords: "4.42°N / 3.93°N · Speedboat Corridors",
              desc: "Speedboat & luxury yacht access for instant arrival. Features The Ritz-Carlton, Waldorf Astoria, and Baros.",
              transfer: "20–45 min Luxury Yacht",
              color: "border-blue-500/30",
            },
            {
              title: "Equator & Southern Atolls",
              coords: "0°00'00\" · Gaafu & Addu",
              desc: "Pristine deep channels, untouched coral walls, and British WWII naval history in the Southern Hemisphere.",
              transfer: "Domestic Jet + Speedboat",
              color: "border-amber-500/30",
            },
          ].map((corridor) => (
            <div
              key={corridor.title}
              className={`rounded-2xl border ${corridor.color} bg-white dark:bg-[#071318] p-5 shadow-1 flex flex-col justify-between`}
            >
              <div>
                <span className="text-[11px] font-mono text-muted dark:text-slate-400 block mb-1">
                  {corridor.coords}
                </span>
                <h3 className="font-display text-lg text-ocean dark:text-cyan-200 font-semibold">
                  {corridor.title}
                </h3>
                <p className="text-xs text-muted dark:text-slate-300 mt-2 leading-relaxed">
                  {corridor.desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border-subtle/80 text-[11px] font-semibold text-lagoon-ink dark:text-cyan-400 flex items-center gap-1.5">
                <Plane size={13} />
                <span>{corridor.transfer}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Plan Stays Footer CTA */}
      <section className="rounded-3xl border border-border-subtle bg-sand/60 dark:bg-white/5 p-8 text-center space-y-4">
        <h2 className="text-2xl sm:text-3xl font-display text-ocean dark:text-cyan-200">
          Ready to Coordinate Your Island Itinerary?
        </h2>
        <p className="mx-auto max-w-xl text-sm text-muted font-light leading-relaxed">
          Our resident Maldivian specialists coordinate direct partner rates, bespoke seaplane transfer connections, and tailor-made villa placements.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
          <Button asChild variant="conversion" className="rounded-full px-8 py-3.5 text-base font-semibold shadow-md">
            <Link href="/plan">Plan My Bespoke Trip &rarr;</Link>
          </Button>
          <Button asChild variant="secondary" className="rounded-full px-6 py-3.5 text-base font-semibold">
            <Link href="/contact">Send an Enquiry</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
