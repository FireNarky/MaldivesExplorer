import type { Metadata } from "next";
import Link from "next/link";
import { Plane, Compass, Sparkles, MapPin } from "lucide-react";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import {
  Archipelago3DMap,
  RESORTS_DATA,
  type MapResort,
} from "@/components/map/archipelago-3d-map";
import { publicMetadata } from "@/lib/seo/metadata";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { publishedPublic } from "@/modules/discovery/visibility";
import { logError } from "@/lib/observability/log";

export const metadata: Metadata = publicMetadata({
  title: "Interactive 3D Maldives Archipelago & Resort Map",
  description:
    "Explore 26 natural geographic atolls and published private island sanctuaries in an interactive 3D perspective.",
  path: "/map",
});

const PALETTE_COLORS = [
  "#06b6d4",
  "#10b981",
  "#eab308",
  "#38bdf8",
  "#818cf8",
  "#f43f5e",
  "#14b8a6",
  "#fb923c",
];

type DirectoryAtoll = {
  id: string;
  name: string;
  slug: string;
  summary: string;
};

async function loadMapDirectory(): Promise<{
  resorts: MapResort[];
  atolls: DirectoryAtoll[];
}> {
  try {
    const [dbResorts, dbAtolls] = await Promise.all([
      db.resort.findMany({
        where: publishedPublic(),
        orderBy: [{ popularityRank: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          summary: true,
          editorialPositioning: true,
          island: {
            select: {
              name: true,
              status: true,
              latitude: true,
              longitude: true,
              atoll: {
                select: {
                  name: true,
                  slug: true,
                  status: true,
                  latitude: true,
                  longitude: true,
                },
              },
            },
          },
          transfers: {
            orderBy: { sortOrder: "asc" },
            select: {
              durationMinutes: true,
              transferType: { select: { label: true } },
            },
          },
        },
      }),
      db.atoll.findMany({
        where: publishedPublic(),
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          summary: true,
        },
      }),
    ]);

    const presetBySlug = new Map(RESORTS_DATA.map((item) => [item.slug, item]));

    const resorts: MapResort[] = dbResorts
      .filter((r) => r.island.status === "PUBLISHED" && r.island.atoll.status === "PUBLISHED")
      .map((r, index) => {
        const preset = presetBySlug.get(r.slug);
        const lat =
          r.island.latitude !== null
            ? Number(r.island.latitude)
            : r.island.atoll.latitude !== null
              ? Number(r.island.atoll.latitude)
              : (preset?.lat ?? 4.1918);
        const lng =
          r.island.longitude !== null
            ? Number(r.island.longitude)
            : r.island.atoll.longitude !== null
              ? Number(r.island.atoll.longitude)
              : (preset?.lng ?? 73.5291);
        const primaryTransfer = r.transfers[0];
        const transferSummary = primaryTransfer
          ? primaryTransfer.durationMinutes !== null
            ? `${primaryTransfer.durationMinutes} min ${primaryTransfer.transferType.label}`
            : primaryTransfer.transferType.label
          : null;

        return {
          id: r.id,
          name: r.name,
          slug: r.slug,
          atoll: r.island.atoll.name,
          lat,
          lng,
          transferSummary,
          highlights: preset?.highlights ?? [],
          vibe: r.editorialPositioning ?? preset?.vibe ?? r.island.atoll.name,
          summary: r.summary,
          tag: preset?.tag ?? r.island.atoll.name,
          color: preset?.color ?? PALETTE_COLORS[index % PALETTE_COLORS.length]!,
        };
      });

    return {
      resorts,
      atolls: dbAtolls,
    };
  } catch (error) {
    logError(error instanceof Error ? error.message : "Map directory could not be loaded.");
    return { resorts: RESORTS_DATA, atolls: [] };
  }
}

export default async function MapPage({
  searchParams,
}: {
  searchParams?: Promise<{ resort?: string }>;
}) {
  const resolved = searchParams ? await searchParams : {};
  const { resort } = resolved;
  const { resorts, atolls } = await loadMapDirectory();

  return (
    <div className="space-y-8 py-2 sm:py-6 animate-in fade-in duration-300">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "3D Archipelago Map" }]} />

      {/* Clean Minimal Page Header */}
      <div className="space-y-2 max-w-2xl">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">
          <Compass size={13} aria-hidden="true" />
          Geographic Bathymetry &amp; Island Directory
        </span>
        <h1 className="text-3xl sm:text-4xl font-display font-medium text-ocean dark:text-cyan-200">
          Maldivian Archipelago Map
        </h1>
        <p className="text-sm sm:text-base text-muted dark:text-slate-300 font-light leading-relaxed">
          Orbit and explore 26 natural atolls spanning the equator, or browse the accessible
          directory of published sanctuaries and atolls below.
        </p>
      </div>

      {/* 3D Map Component */}
      <section aria-label="3D Archipelago Explorer" className="w-full">
        <Archipelago3DMap initialResortSlug={resort} resorts={resorts} />
      </section>

      {/* Accessible MapWithList Directory (Design_System.md §4.4 & §7.2) */}
      <section
        aria-labelledby="map-directory-heading"
        className="rounded-3xl border border-border-subtle bg-white dark:bg-[#0d1e27] dark:border-[#1a3442] p-6 sm:p-8 shadow-1 space-y-6"
      >
        <div className="space-y-1">
          <h2
            id="map-directory-heading"
            className="text-xl sm:text-2xl font-display font-medium text-ocean dark:text-cyan-200"
          >
            Published Archipelago Directory
          </h2>
          <p className="text-xs sm:text-sm text-muted dark:text-slate-300">
            Every place shown on the map is also available as a direct link in keyboard tab order.
          </p>
        </div>

        {resorts.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">
              Published Resorts ({resorts.length})
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {resorts.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-border-subtle bg-sand/30 dark:bg-white/5 p-4 flex flex-col justify-between gap-2"
                >
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted dark:text-slate-400 block">
                      {item.atoll}
                    </span>
                    <Link
                      href={`/resorts/${item.slug}`}
                      className="font-display text-base font-medium text-ocean dark:text-cyan-300 hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-1 text-xs text-ink dark:text-slate-300 line-clamp-2">
                      {item.summary}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border-subtle/60 text-[11px] text-muted dark:text-slate-400 font-mono">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={11} aria-hidden="true" />
                      {item.lat.toFixed(2)}°N, {item.lng.toFixed(2)}°E
                    </span>
                    <span>{item.transferSummary ?? "Price & transfers on request"}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted">No published resorts are currently listed.</p>
        )}

        {atolls.length > 0 ? (
          <div className="space-y-3 pt-2 border-t border-border-subtle">
            <h3 className="text-xs font-bold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">
              Published Atolls ({atolls.length})
            </h3>
            <ul className="flex flex-wrap gap-2">
              {atolls.map((atoll) => (
                <li key={atoll.id}>
                  <Link
                    href={`/atolls/${atoll.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-sand/40 dark:bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-ocean dark:text-cyan-200 hover:border-ocean dark:hover:border-cyan-400 transition-colors"
                  >
                    <Compass size={12} aria-hidden="true" />
                    <span>{atoll.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {/* Geographic & Planning Notes (No unverified transfer duration claims per D-013) */}
      <div className="grid gap-4 sm:grid-cols-3 pt-2">
        <div className="rounded-2xl border border-border-subtle bg-white dark:bg-white/5 p-4 space-y-1">
          <span className="text-xs font-semibold text-ocean dark:text-cyan-300 flex items-center gap-1.5">
            <Plane size={13} aria-hidden="true" /> Air &amp; Sea Connections
          </span>
          <p className="text-xs text-muted dark:text-slate-400 leading-relaxed font-light">
            Resorts across the Maldivian atolls connect via Velana International Airport (MLE) by
            seaplane, domestic flight, or boat depending on atoll location and arrival schedule.
          </p>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-white dark:bg-white/5 p-4 space-y-1">
          <span className="text-xs font-semibold text-ocean dark:text-cyan-300 flex items-center gap-1.5">
            <Sparkles size={13} aria-hidden="true" /> Itemized Transfer Quotations
          </span>
          <p className="text-xs text-muted dark:text-slate-400 leading-relaxed font-light">
            Published transfer options appear on each resort profile where recorded; exact schedules
            and return transfer pricing are confirmed in your written quotation.
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
            <Button
              asChild
              variant="secondary"
              className="w-full rounded-full py-1.5 text-xs font-semibold"
            >
              <Link href="/contact">Inquire with a Specialist</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
