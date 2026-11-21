import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";
import { DestinationCard } from "@/components/patterns/destination-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { db } from "@/lib/db";
import { publishedPublic } from "@/modules/discovery/visibility";

export const metadata: Metadata = publicMetadata({
  title: "Maldives Destinations & Atolls",
  description:
    "Explore 26 natural geographic atolls, UNESCO Biosphere Reserves, and pristine island channels.",
  path: "/destinations",
});

export default async function DestinationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  try {
    const params = await searchParams;
    const filter = params?.filter ?? "all";

    const atolls = await db.atoll.findMany({
      where: publishedPublic(),
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        summary: true,
        latitude: true,
        longitude: true,
        islands: {
          where: publishedPublic(),
          select: {
            id: true,
            resorts: {
              where: publishedPublic(),
              select: { name: true, slug: true },
            },
          },
        },
      },
    });

    const atollsWithData = atolls.map((atoll) => {
      const resorts = atoll.islands.flatMap((i) => i.resorts);
      return {
        id: atoll.id,
        name: atoll.name,
        slug: atoll.slug,
        summary: atoll.summary,
        latitude: atoll.latitude ? Number(atoll.latitude) : null,
        longitude: atoll.longitude ? Number(atoll.longitude) : null,
        islandCount: atoll.islands.length,
        resortCount: resorts.length,
        resorts,
      };
    });

    // Simple filter matching
    const filteredAtolls = atollsWithData.filter((a) => {
      if (filter === "unesco")
        return a.slug.includes("baa") || a.summary.toLowerCase().includes("unesco");
      if (filter === "speedboat")
        return a.slug.includes("male") || a.summary.toLowerCase().includes("speedboat");
      if (filter === "seaplane") return !a.slug.includes("male");
      if (filter === "diving")
        return (
          a.slug.includes("ari") ||
          a.summary.toLowerCase().includes("shark") ||
          a.summary.toLowerCase().includes("dive")
        );
      return true;
    });

    return (
      <div className="grid gap-10">
        <PageHeader
          crumbs={[{ name: "Home", href: "/" }, { name: "Destinations" }]}
          title="Destinations & Atolls"
          lede="The Maldives stretches across 26 natural geographic atolls, each defined by distinct marine ecosystems, coral thilas, and private island hideaways."
        />

        {/* Atoll Geography Hero & Stats Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-[#083b4c]/95 via-[#083b4c] to-[#062936] dark:from-[#061d28] dark:via-[#082633] dark:to-[#041219] p-6 sm:p-10 text-white shadow-2">
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#2bbcd0_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-lagoon/20 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="space-y-4 lg:col-span-7">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md border border-white/20">
                <Compass size={13} className="text-coral" />
                Geography &amp; Marine Corridors
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-medium text-white leading-snug">
                26 Natural Geographic Atolls Spanning the Equator
              </h2>
              <p className="text-sm sm:text-base text-slate-200 font-light leading-relaxed">
                From North Malé&apos;s convenient luxury speedboat corridors to Baa Atoll&apos;s
                protected UNESCO biosphere and South Ari&apos;s whale shark sanctuaries, discover
                where to stay for your travel vision.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
                <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm border border-white/15">
                  <span className="block font-display text-xl sm:text-2xl font-bold text-white">
                    26
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-slate-300">
                    Natural Atolls
                  </span>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm border border-white/15">
                  <span className="block font-display text-xl sm:text-2xl font-bold text-white">
                    UNESCO
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-slate-300">
                    Baa Biosphere
                  </span>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm border border-white/15">
                  <span className="block font-display text-xl sm:text-2xl font-bold text-white">
                    Sea &amp; Air
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-slate-300">
                    Transfer Modes
                  </span>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm border border-white/15">
                  <span className="block font-display text-xl sm:text-2xl font-bold text-white">
                    {atollsWithData.length}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-slate-300">
                    Published Atolls
                  </span>
                </div>
              </div>

              <div className="pt-3">
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 rounded-full bg-[#7ccdc6] px-5 py-2.5 text-xs font-bold text-[#071318] shadow-md hover:bg-[#9adbd5] transition-all hover:scale-105 active:scale-95"
                >
                  <Compass size={15} />
                  <span>Open the Thari Star Chart &rarr;</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-white/20 bg-white/10 dark:bg-black/30 p-6 backdrop-blur-md space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/15 pb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#7ccdc6]">
                    Archipelago Coordinates
                  </span>
                  <span className="font-mono text-xs text-slate-300">7.1°N — 0.7°S</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-light">
                  Stretching across 871 kilometers of open Indian Ocean, every atoll hosts unique marine channels, coral thilas, and private island hideaways.
                </p>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold mb-1">Northern Atolls</span>
                    <span className="text-white font-medium text-xs block">Baa · Noonu · Lhaviyani</span>
                    <span className="text-[11px] text-[#7ccdc6] block mt-1">Scenic Seaplane Flights</span>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold mb-1">Central Atolls</span>
                    <span className="text-white font-medium text-xs block">Malé · South Ari</span>
                    <span className="text-[11px] text-[#7ccdc6] block mt-1">Speedboat &amp; Whale Sharks</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 text-[11px] text-slate-300 border-t border-white/10">
                  <span>Equatorial Coral Ecosystems</span>
                  <Link href="/map" className="text-[#7ccdc6] hover:underline font-semibold inline-flex items-center gap-1">
                    Launch Star Chart &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Region Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/destinations"
            className={`rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95 ${
              filter === "all"
                ? "bg-lagoon-ink text-white shadow-sm ring-1 ring-lagoon-ink"
                : "border border-border-subtle bg-white dark:bg-white/5 text-ink hover:bg-mist/50 dark:hover:bg-white/10"
            }`}
          >
            All Atolls ({atollsWithData.length})
          </Link>
          <Link
            href="/destinations?filter=unesco"
            className={`rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95 ${
              filter === "unesco"
                ? "bg-lagoon-ink text-white shadow-sm ring-1 ring-lagoon-ink"
                : "border border-border-subtle bg-white dark:bg-white/5 text-ink hover:bg-mist/50 dark:hover:bg-white/10"
            }`}
          >
            🌿 UNESCO &amp; Marine Reserves
          </Link>
          <Link
            href="/destinations?filter=speedboat"
            className={`rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95 ${
              filter === "speedboat"
                ? "bg-lagoon-ink text-white shadow-sm ring-1 ring-lagoon-ink"
                : "border border-border-subtle bg-white dark:bg-white/5 text-ink hover:bg-mist/50 dark:hover:bg-white/10"
            }`}
          >
            🚤 Speedboat from Malé
          </Link>
          <Link
            href="/destinations?filter=seaplane"
            className={`rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95 ${
              filter === "seaplane"
                ? "bg-lagoon-ink text-white shadow-sm ring-1 ring-lagoon-ink"
                : "border border-border-subtle bg-white dark:bg-white/5 text-ink hover:bg-mist/50 dark:hover:bg-white/10"
            }`}
          >
            ✈️ Scenic Seaplane Flights
          </Link>
          <Link
            href="/destinations?filter=diving"
            className={`rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95 ${
              filter === "diving"
                ? "bg-lagoon-ink text-white shadow-sm ring-1 ring-lagoon-ink"
                : "border border-border-subtle bg-white dark:bg-white/5 text-ink hover:bg-mist/50 dark:hover:bg-white/10"
            }`}
          >
            🤿 World-Class Diving
          </Link>
        </div>

        {/* Atolls Grid */}
        {filteredAtolls.length === 0 ? (
          <EmptyState title="Atolls">
            <p>No atolls match the selected filter.</p>
          </EmptyState>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAtolls.map((atoll) => (
              <DestinationCard key={atoll.id} item={atoll} />
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "Destinations could not be loaded.");
    return (
      <ErrorState title="Destinations">
        <p>Destinations could not be loaded.</p>
      </ErrorState>
    );
  }
}
