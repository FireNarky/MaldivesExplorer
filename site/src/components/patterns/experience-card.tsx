import Image from "next/image";
import Link from "next/link";
import { Clock, Compass, Sparkles } from "lucide-react";

export type ExperienceCardData = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  durationGuidance?: string | null;
  seasonality?: string | null;
  categoryName?: string | null;
  image?: { id: string; altText: string } | null;
};

export function ExperienceCard({ item }: { item: ExperienceCardData }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-1 transition-all duration-200 hover:-translate-y-1 hover:border-ocean/40 hover:shadow-2">
      <div className="relative aspect-[16/10] bg-mist overflow-hidden">
        {item.image ? (
          <Image
            src={`/media/${item.image.id}`}
            alt={item.image.altText}
            fill
            unoptimized
            sizes="(min-width: 64rem) 33vw, (min-width: 40rem) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-lagoon-ink">
            <Compass size={32} strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}
        {item.categoryName ? (
          <span className="absolute top-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ocean shadow-sm backdrop-blur">
            {item.categoryName}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5 lg:p-6">
        <h2 className="mb-2 font-display text-xl text-ocean">
          <Link
            href={`/experiences/${item.slug}`}
            className="after:absolute after:inset-0 hover:underline"
          >
            {item.name}
          </Link>
        </h2>

        <p className="mb-4 flex-1 text-sm text-ink leading-relaxed">{item.summary}</p>

        <div className="mt-auto space-y-3 border-t border-border-subtle/80 pt-3 text-xs text-muted">
          {item.durationGuidance ? (
            <p className="flex items-center gap-1.5">
              <Clock size={14} className="text-lagoon-ink" aria-hidden="true" />
              <span>Duration: {item.durationGuidance}</span>
            </p>
          ) : null}
          {item.seasonality ? (
            <p className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-lagoon-ink" aria-hidden="true" />
              <span>Season: {item.seasonality}</span>
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
