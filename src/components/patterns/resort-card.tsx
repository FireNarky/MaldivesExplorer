import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Waves } from "lucide-react";
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
    <article className="group relative isolate flex aspect-[4/5] lg:aspect-[6/7] h-full flex-col justify-end overflow-hidden rounded-3xl bg-[#0a2342] text-white shadow-1 transition-all duration-500 hover:-translate-y-1 hover:shadow-3">
      {resort.image ? (
        <Image
          src={`/media/${resort.image.id}`}
          alt={resort.image.altText}
          fill
          sizes="(min-width: 64rem) 30vw, (min-width: 40rem) 45vw, 80vw"
          className="-z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
      ) : (
        <div className="absolute inset-0 -z-10 flex items-center justify-center text-[#9adbd5]">
          <Waves aria-hidden="true" size={32} strokeWidth={1.5} />
          <span className="sr-only">No photo published yet</span>
        </div>
      )}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0a2342] via-[#0a2342]/40 to-transparent" />
      <div className="flex flex-col gap-2 p-5 sm:p-6">
        {resort.location ? (
          <p className="flex items-center gap-1.5 text-[0.68rem] uppercase tracking-[0.2em] text-white/75">
            <MapPin aria-hidden="true" size={12} className="text-[#E2B65C]" />
            {resort.location}
          </p>
        ) : null}
        <h2 className="font-display text-[1.75rem] font-medium leading-tight text-white">
          <Link href={`/resorts/${resort.slug}`} className="text-white after:absolute after:inset-0">
            {resort.name}
          </Link>
        </h2>
        <p className="line-clamp-2 text-sm leading-relaxed text-white/75">{resort.summary}</p>
        <div className="mt-2 flex items-center justify-between border-t border-white/15 pt-3 text-xs text-white/70 [&_*]:!text-white/70">
          <PriceDisclosure />
          <span className="flex size-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition-colors group-hover:bg-[#E2B65C] group-hover:[&_svg]:!text-[#0a2342]">
            <ArrowUpRight aria-hidden="true" size={16} />
          </span>
        </div>
      </div>
    </article>
  );
}
