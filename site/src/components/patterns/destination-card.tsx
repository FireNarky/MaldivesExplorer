import Link from "next/link";
import { Compass, Hotel, MapPin, Plane } from "lucide-react";

export type DestinationCardData = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  latitude?: number | null;
  longitude?: number | null;
  islandCount?: number;
  resortCount?: number;
  resorts?: Array<{ name: string; slug: string }>;
  highlight?: string;
  transferType?: string;
};

// Curated atoll intelligence mapping for rich traveler insights
const ATOLL_INSIGHTS: Record<string, { highlight: string; transfer: string; gradient: string }> = {
  "baa-atoll": {
    highlight: "UNESCO Biosphere & Hanifaru Bay Manta Rays",
    transfer: "30m Seaplane",
    gradient: "from-teal-600/30 via-lagoon/20 to-ocean/40",
  },
  "north-male-atoll": {
    highlight: "Luxury Speedboat Corridor & Surf Breaks",
    transfer: "25–45m Speedboat",
    gradient: "from-cyan-600/30 via-ocean/20 to-lagoon/40",
  },
  "south-male-atoll": {
    highlight: "Lagoon Sandbanks & Swift Transfer Access",
    transfer: "30–45m Speedboat",
    gradient: "from-blue-600/30 via-lagoon/20 to-ocean/40",
  },
  "south-ari-atoll": {
    highlight: "Year-Round Whale Shark Marine Protected Area",
    transfer: "25m Seaplane",
    gradient: "from-emerald-600/30 via-teal/20 to-ocean/40",
  },
  "north-ari-atoll": {
    highlight: "Dramatic Underwater Pinnacles (Thilas) & Hammerheads",
    transfer: "25m Seaplane",
    gradient: "from-lagoon/30 via-cyan-600/20 to-ocean/40",
  },
  "noonu-atoll": {
    highlight: "Ultra-Luxury Island Residences & Private Sandbars",
    transfer: "45m Seaplane",
    gradient: "from-indigo-600/30 via-lagoon/20 to-ocean/40",
  },
  "raa-atoll": {
    highlight: "Pristine Deep Ocean Channels & Untouched Reefs",
    transfer: "45m Seaplane",
    gradient: "from-sky-600/30 via-lagoon/20 to-ocean/40",
  },
  "lhaviyani-atoll": {
    highlight: "World-Class Underwater Dining & Shipwreck Diving",
    transfer: "40m Seaplane",
    gradient: "from-teal-600/30 via-cyan/20 to-ocean/40",
  },
  "dhaalu-atoll": {
    highlight: "Remote Surfing Passes & Coral Gardens",
    transfer: "40m Domestic / Seaplane",
    gradient: "from-blue-700/30 via-lagoon/20 to-ocean/40",
  },
};

export function DestinationCard({ item }: { item: DestinationCardData }) {
  const insight = ATOLL_INSIGHTS[item.slug] ?? {
    highlight: item.highlight ?? "Tropical Coral Atoll & Lagoons",
    transfer: item.transferType ?? "Seaplane / Speedboat",
    gradient: "from-lagoon/25 via-ocean/15 to-[#062936]/40",
  };

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border-subtle bg-white dark:bg-white/5 dark:border-white/10 shadow-1 transition-all duration-300 hover:-translate-y-2 hover:border-ocean/50 dark:hover:border-cyan-400/50 hover:shadow-2">
      {/* Decorative Atoll Horizon Banner */}
      <div className={`relative h-28 overflow-hidden bg-gradient-to-br ${insight.gradient} p-5 text-sand`}>
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 dark:bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sand backdrop-blur-md border border-white/25">
            <Compass size={13} className="text-coral" aria-hidden="true" />
            Atoll Geography
          </span>

          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-sand backdrop-blur-md">
            <Plane size={12} />
            {insight.transfer}
          </span>
        </div>

        <div className="absolute bottom-3 left-5 right-5 flex items-center justify-between text-xs text-sand/80">
          {item.latitude && item.longitude ? (
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <MapPin size={12} className="text-coral" aria-hidden="true" />
              {Number(item.latitude).toFixed(2)}°N, {Number(item.longitude).toFixed(2)}°E
            </span>
          ) : <span />}
          {typeof item.islandCount === "number" && (
            <span className="font-medium text-[11px] tracking-wide uppercase">
              {item.islandCount} {item.islandCount === 1 ? "Island" : "Islands"}
            </span>
          )}
        </div>
      </div>

      {/* Card Content Body */}
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-2">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">
            {insight.highlight}
          </span>
          <h2 className="mt-1 font-display text-2xl text-ocean font-medium tracking-tight">
            <Link href={`/atolls/${item.slug}`} className="after:absolute after:inset-0 hover:underline">
              {item.name}
            </Link>
          </h2>
        </div>

        <p className="mb-5 flex-1 text-sm text-ink leading-relaxed line-clamp-3">
          {item.summary}
        </p>

        {/* Premier Resorts in this atoll if available */}
        {item.resorts && item.resorts.length > 0 ? (
          <div className="mb-5 rounded-2xl bg-sand/60 dark:bg-white/5 p-3 text-xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1">
              <Hotel size={12} className="text-lagoon-ink dark:text-cyan-400" />
              Featured Stays:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {item.resorts.slice(0, 3).map((r) => (
                <span
                  key={r.slug}
                  className="rounded-lg bg-white dark:bg-white/10 px-2 py-0.5 text-[11px] font-medium text-ink shadow-2xs border border-border-subtle/50"
                >
                  {r.name}
                </span>
              ))}
              {item.resorts.length > 3 ? (
                <span className="text-[11px] font-semibold text-muted self-center">
                  +{item.resorts.length - 3} more
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Bottom CTA Row */}
        <div className="mt-auto flex items-center justify-between border-t border-border-subtle/80 pt-4 text-xs font-semibold">
          <span className="flex items-center gap-1 text-lagoon-ink dark:text-cyan-400 group-hover:translate-x-1 transition-transform">
            Explore {item.name} &rarr;
          </span>
          <span className="text-muted font-normal">Curated Directory</span>
        </div>
      </div>
    </article>
  );
}
