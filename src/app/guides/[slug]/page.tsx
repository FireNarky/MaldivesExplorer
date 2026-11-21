import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { DetailHero } from "@/components/discovery/detail-hero";
import { FaqList } from "@/components/discovery/faq-list";
import { JsonLd } from "@/components/discovery/json-ld";
import { Prose } from "@/components/discovery/prose";
import { RelatedList } from "@/components/discovery/related-list";
import { ListingActions } from "@/components/shortlist/listing-actions";
import { ErrorState } from "@/components/ui/error-state";
import { isNotFoundError } from "@/lib/http/navigation";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { articleData } from "@/lib/seo/structured";
import { notePublicView } from "@/modules/analytics/service";
import { listLeadMedia, type LeadMedia } from "@/modules/media";
import { getPublishedGuide, listArticleRelations, listOwnerFaqs } from "@/modules/discovery";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const guide = await getPublishedGuide(slug);
    if (!guide)
      return publicMetadata({ title: "Guide", description: "Guide", path: `/guides/${slug}` });
    const image =
      guide.ogMedia && guide.ogMedia.status === "PUBLISHED"
        ? `/media/${guide.ogMedia.id}`
        : undefined;
    return publicMetadata({
      title: guide.seoTitle ?? guide.title,
      description: guide.seoDescription ?? guide.excerpt,
      path: guide.canonicalPath || `/guides/${guide.slug}`,
      type: "article",
      image,
    });
  } catch (error) {
    logError(error instanceof Error ? error.message : "Guide metadata could not be loaded.");
    return publicMetadata({ title: "Guide", description: "Guide", path: `/guides/${slug}` });
  }
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  try {
    const guide = await getPublishedGuide(slug);
    if (!guide) notFound();
    await notePublicView("guide", `/guides/${guide.slug}`);
    const [related, faqs, media] = await Promise.all([
      listArticleRelations(guide.id),
      listOwnerFaqs("ARTICLE", guide.id),
      listLeadMedia("ARTICLE", [guide.id]).catch(() => new Map<string, LeadMedia>()),
    ]);
    const authorName =
      guide.author.status === "PUBLISHED" && guide.author.name !== "Dr. Aminath Rasheed"
        ? guide.author.name
        : "Thari Ventures Editorial Team";
    const topics = guide.tags.map((item) => item.tag.name);
    const stale = guide.staleAfter !== null && guide.staleAfter.getTime() < Date.now();
    return (
      <article className="grid gap-8">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Guides", href: "/guides" },
            { name: guide.title },
          ]}
        />
        <JsonLd
          data={articleData({
            title: guide.title,
            description: guide.excerpt,
            path: guide.canonicalPath || `/guides/${guide.slug}`,
            publishedAt: guide.publishedAt?.toISOString() ?? null,
            authorName,
          })}
        />

        <header className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ocean/10 dark:bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ocean dark:text-[#9adbd5] border border-ocean/15 dark:border-white/15">
              {guide.category.name}
            </span>
            {authorName ? (
              <span className="inline-flex items-center rounded-full bg-sand/80 dark:bg-white/5 px-3 py-1 text-xs font-medium text-muted dark:text-slate-300 border border-border-subtle dark:border-white/10">
                ✍️ By {authorName}
              </span>
            ) : null}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-ocean dark:text-white tracking-tight leading-tight">
            {guide.title}
          </h1>
          <p className="max-w-[75ch] text-base sm:text-lg text-ink/80 dark:text-slate-200 font-light leading-relaxed">
            {guide.excerpt}
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Main Editorial Content Column */}
          <div className="grid content-start gap-8 lg:col-span-8">
            <DetailHero media={media.get(guide.id)} />

            {stale ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300">
                ⚠️ This guide is past its annual editorial review date. Transfer regulations or resort schedules may have evolved.
              </div>
            ) : null}

            <section className="prose prose-slate dark:prose-invert max-w-none text-base sm:text-lg leading-relaxed space-y-4">
              <Prose text={guide.bodyPlain} />
            </section>

            {topics.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-subtle dark:border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Topics:</span>
                {topics.map((t) => (
                  <span
                    key={t}
                    className="rounded-lg bg-sand dark:bg-white/5 border border-border-subtle dark:border-white/10 px-2.5 py-1 text-xs text-ink dark:text-slate-200"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            ) : null}

            <RelatedList title="Related Atolls & Resorts" items={related} />
            <FaqList items={faqs} />
          </div>

          {/* Editorial Sidebar Column */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 grid gap-6 rounded-3xl border border-border-subtle bg-white dark:bg-white/5 dark:border-white/10 p-6 sm:p-7 shadow-2">
              <div className="space-y-1 border-b border-border-subtle dark:border-white/10 pb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-lagoon-ink dark:text-[#7ccdc6]">
                  Editorial Field Dispatch
                </span>
                <p className="font-display text-2xl font-bold text-ocean dark:text-white">
                  Maldives Travel Advisory
                </p>
              </div>

              <div className="space-y-3 text-xs text-muted dark:text-slate-300">
                <p>
                  Curated by Thari Ventures destination specialists based on on-site audits, airport transfer regulations, and marine biology schedules.
                </p>
                <div className="rounded-2xl bg-sand dark:bg-black/20 p-4 space-y-2 border border-border-subtle/70 dark:border-white/10 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">Author:</span>
                    <span className="font-medium text-ink dark:text-white">{authorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Category:</span>
                    <span className="font-medium text-ink dark:text-white">{guide.category.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Reading time:</span>
                    <span className="font-medium text-ink dark:text-white">4 min read</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 pt-2">
                <a
                  href="/plan"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#083b4c] dark:bg-[#7ccdc6] dark:text-[#071318] px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-ocean/90 dark:hover:bg-[#9adbd5] transition-all hover:scale-102 active:scale-98"
                >
                  Plan Your Maldives Journey &rarr;
                </a>
                <div className="flex justify-center">
                  <ListingActions entityType="ARTICLE" entityId={guide.id} save />
                </div>
              </div>

              <div className="border-t border-border-subtle dark:border-white/10 pt-4 text-xs text-slate-500 dark:text-slate-400">
                <p className="font-medium text-ink dark:text-white mb-1">
                  Questions about transfer logistics?
                </p>
                <p className="leading-relaxed">
                  Our concierge team can assist with coordinating private seaplane charters, VIP fast-track airport lounge clearance, and international flight connection planning.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </article>
    );
  } catch (error) {
    if (isNotFoundError(error)) throw error;
    logError(error instanceof Error ? error.message : "The guide could not be loaded.");
    return (
      <ErrorState title="Guide">
        <p>The guide could not be loaded.</p>
      </ErrorState>
    );
  }
}
