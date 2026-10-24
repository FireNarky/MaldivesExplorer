import Image from "next/image";
import Link from "next/link";
import { MapPin, Waves } from "lucide-react";
import { PriceDisclosure } from "@/components/patterns/price-disclosure";

export type ResortCardData = {
  slug: string;
  name: string;
  summary: string;
  location: string | null;
  image: { id: string; altText: string } | null;
};

export function ResortCard({ resort }: { resort: ResortCardData }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-subtle bg-white dark:bg-white/5 dark:border-white/10 shadow-1 hover:-translate-y-1.5 hover:shadow-2 hover:border-ocean/40 dark:hover:border-cyan-400/40 transition-all duration-300">
      <div className="relative aspect-[3/2] overflow-hidden bg-mist dark:bg-white/5">
        {resort.image ? (
          <Image
            src={`/media/${resort.image.id}`}
            alt={resort.image.altText}
            fill
            sizes="(min-width: 64rem) 30vw, (min-width: 40rem) 45vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-lagoon-ink dark:text-cyan-400">
            <Waves aria-hidden="true" size={32} strokeWidth={1.75} />
            <span className="sr-only">No photo published yet</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5 lg:p-6">
        {resort.location ? (
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
            <MapPin aria-hidden="true" size={14} className="text-lagoon-ink dark:text-cyan-400" />
            {resort.location}
          </p>
        ) : null}
        <h2 className="text-2xl font-display font-medium">
          <Link
            href={`/resorts/${resort.slug}`}
            className="text-ocean after:absolute after:inset-0 hover:underline"
          >
            {resort.name}
          </Link>
        </h2>
        <p className="text-sm text-ink line-clamp-2 leading-relaxed">{resort.summary}</p>
        <div className="mt-auto pt-2 border-t border-border-subtle/80 flex items-center justify-between">
          <PriceDisclosure />
          <span className="text-xs font-semibold text-lagoon-ink dark:text-cyan-400 group-hover:translate-x-1 transition-transform">
            View resort &rarr;
          </span>
        </div>
      </div>
    </article>
  );
}
