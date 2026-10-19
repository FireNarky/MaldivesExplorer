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
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-white shadow-1 hover:border-border">
      <div className="relative aspect-[3/2] bg-mist">
        {resort.image ? (
          <Image
            src={`/media/${resort.image.id}`}
            alt={resort.image.altText}
            fill
            unoptimized
            sizes="(min-width: 64rem) 30vw, (min-width: 40rem) 45vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-lagoon-ink">
            <Waves aria-hidden="true" size={32} strokeWidth={1.75} />
            <span className="sr-only">No photo published yet</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 lg:p-6">
        {resort.location ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <MapPin aria-hidden="true" size={16} strokeWidth={1.75} />
            {resort.location}
          </p>
        ) : null}
        <h2 className="text-2xl">
          <Link
            href={`/resorts/${resort.slug}`}
            className="text-ocean after:absolute after:inset-0 hover:underline"
          >
            {resort.name}
          </Link>
        </h2>
        <p className="text-base text-ink">{resort.summary}</p>
        <div className="mt-auto pt-2">
          <PriceDisclosure />
        </div>
      </div>
    </article>
  );
}
