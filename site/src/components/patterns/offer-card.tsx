import Link from "next/link";
import { Calendar, CheckCircle2, Plane, Sparkles } from "lucide-react";
import { PriceDisclosure } from "@/components/patterns/price-disclosure";

export type OfferCardData = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  resortName: string;
  resortSlug: string;
  transferIncluded: boolean;
  minNights?: number | null;
  validUntil: string | Date;
};

export function OfferCard({ item }: { item: OfferCardData }) {
  const formattedExpiry = new Date(item.validUntil).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-subtle bg-white dark:bg-[#0d1e27] dark:border-[#1a3442] p-6 shadow-1 transition-all duration-200 hover:-translate-y-1 hover:border-ocean/40 dark:hover:border-cyan-400/50 hover:shadow-2">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-coral/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-coral-hover dark:text-coral">
          <Sparkles size={14} className="text-coral" aria-hidden="true" />
          Special Offer
        </span>
        <span className="flex items-center gap-1 text-xs text-muted">
          <Calendar size={13} aria-hidden="true" />
          Valid through {formattedExpiry}
        </span>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400 mb-1">
        {item.resortName}
      </p>

      <h2 className="mb-2 font-display text-2xl text-ocean dark:text-cyan-300">
        <Link href={`/offers/${item.slug}`} className="after:absolute after:inset-0 hover:underline">
          {item.title}
        </Link>
      </h2>

      <p className="mb-6 flex-1 text-sm text-ink dark:text-sand/85 leading-relaxed">{item.summary}</p>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {item.transferIncluded ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-mist dark:bg-cyan-950/50 dark:border dark:border-cyan-800/40 px-2.5 py-1 font-semibold text-lagoon-ink dark:text-cyan-300">
            <Plane size={13} aria-hidden="true" />
            Transfers Included
          </span>
        ) : null}
        {item.minNights ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-sand dark:bg-white/10 px-2.5 py-1 text-muted dark:text-sand/80 border border-border-subtle/50 dark:border-white/10">
            <CheckCircle2 size={13} aria-hidden="true" />
            Min. {item.minNights} nights
          </span>
        ) : null}
      </div>

      <div className="mt-auto border-t border-border-subtle/80 dark:border-white/10 pt-4 flex items-center justify-between">
        <PriceDisclosure />
        <span className="text-xs font-semibold text-lagoon-ink dark:text-cyan-400 group-hover:translate-x-1 transition-transform">
          View Privilege &rarr;
        </span>
      </div>
    </article>
  );
}
