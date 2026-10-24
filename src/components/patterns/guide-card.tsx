import Image from "next/image";
import Link from "next/link";
import { BookOpen, User } from "lucide-react";

export type GuideCardData = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  categoryName?: string | null;
  authorName?: string | null;
  image?: { id: string; altText: string } | null;
};

export function GuideCard({ item }: { item: GuideCardData }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-subtle bg-white dark:bg-white/5 dark:border-white/10 shadow-1 transition-all duration-300 hover:-translate-y-1.5 hover:border-ocean/40 dark:hover:border-cyan-400/40 hover:shadow-2">
      <div className="relative aspect-[16/9] bg-mist dark:bg-white/5 overflow-hidden">
        {item.image ? (
          <Image
            src={`/media/${item.image.id}`}
            alt={item.image.altText}
            fill
            sizes="(min-width: 64rem) 33vw, (min-width: 40rem) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-lagoon-ink dark:text-cyan-400">
            <BookOpen size={32} strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}
        {item.categoryName ? (
          <span className="absolute top-3 left-3 rounded-full bg-white/95 dark:bg-slate-900/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ocean dark:text-cyan-400 shadow-sm backdrop-blur border border-white/20 dark:border-white/10">
            {item.categoryName}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5 lg:p-6">
        <h2 className="mb-2 font-display text-xl text-ocean line-clamp-2">
          <Link
            href={`/guides/${item.slug}`}
            className="after:absolute after:inset-0 hover:underline"
          >
            {item.title}
          </Link>
        </h2>

        <p className="mb-4 flex-1 text-sm text-ink leading-relaxed line-clamp-3">{item.excerpt}</p>

        <div className="mt-auto flex items-center justify-between border-t border-border-subtle/80 pt-3 text-xs text-muted">
          {item.authorName && item.authorName !== "Dr. Aminath Rasheed" ? (
            <span className="flex items-center gap-1.5 font-medium">
              <User size={14} className="text-lagoon-ink" aria-hidden="true" />
              {item.authorName}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-medium">
              <User size={14} className="text-lagoon-ink" aria-hidden="true" />
              Maldives Explorer Editorial Team
            </span>
          )}
          <span className="font-semibold text-lagoon-ink group-hover:underline">
            Read Guide &rarr;
          </span>
        </div>
      </div>
    </article>
  );
}
