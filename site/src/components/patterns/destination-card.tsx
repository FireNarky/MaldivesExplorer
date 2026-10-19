import Link from "next/link";
import { Compass, MapPin } from "lucide-react";

export type DestinationCardData = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  latitude?: number | null;
  longitude?: number | null;
  islandCount?: number;
};

export function DestinationCard({ item }: { item: DestinationCardData }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-subtle bg-white p-6 shadow-1 transition-all duration-200 hover:-translate-y-1 hover:border-ocean/40 hover:shadow-2">
      <div className="mb-4 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 text-xs font-semibold uppercase tracking-wider text-lagoon-ink">
          <Compass size={14} aria-hidden="true" />
          Atoll
        </span>
        {item.latitude && item.longitude ? (
          <span className="flex items-center gap-1 text-xs text-muted">
            <MapPin size={13} aria-hidden="true" />
            {Number(item.latitude).toFixed(2)}°N, {Number(item.longitude).toFixed(2)}°E
          </span>
        ) : null}
      </div>

      <h2 className="mb-2 font-display text-2xl text-ocean">
        <Link href={`/atolls/${item.slug}`} className="after:absolute after:inset-0 hover:underline">
          {item.name}
        </Link>
      </h2>

      <p className="mb-6 flex-1 text-base text-ink leading-relaxed">{item.summary}</p>

      <div className="mt-auto flex items-center justify-between border-t border-border-subtle/80 pt-4 text-sm">
        <span className="font-semibold text-lagoon-ink group-hover:text-lagoon-ink-hover">
          Explore Atoll &rarr;
        </span>
        <span className="text-xs text-muted">Curated guide</span>
      </div>
    </article>
  );
}
