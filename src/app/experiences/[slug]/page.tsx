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
import { attractionData } from "@/lib/seo/structured";
import { notePublicView } from "@/modules/analytics/service";
import { listLeadMedia, type LeadMedia } from "@/modules/media";
import {
  getPublishedExperience,
  listOwnerFaqs,
  listPublishedPlacesForExperience,
  listRelatedGuides,
} from "@/modules/discovery";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const experience = await getPublishedExperience(slug);
    if (!experience) {
      return publicMetadata({
        title: "Experience",
        description: "Experience",
        path: `/experiences/${slug}`,
      });
    }
    return publicMetadata({
      title: experience.seoTitle ?? experience.name,
      description: experience.seoDescription ?? experience.summary,
      path: `/experiences/${experience.slug}`,
    });
  } catch (error) {
    logError(error instanceof Error ? error.message : "Experience metadata could not be loaded.");
    return publicMetadata({
      title: "Experience",
      description: "Experience",
      path: `/experiences/${slug}`,
    });
  }
}

export default async function ExperiencePage({ params }: PageProps) {
  const { slug } = await params;
  try {
    const experience = await getPublishedExperience(slug);
    if (!experience) notFound();
    await notePublicView("experience", `/experiences/${experience.slug}`);
    const [places, guides, faqs, media] = await Promise.all([
      listPublishedPlacesForExperience(experience.id),
      listRelatedGuides("EXPERIENCE", experience.id),
      listOwnerFaqs("EXPERIENCE", experience.id),
      listLeadMedia("EXPERIENCE", [experience.id]).catch(() => new Map<string, LeadMedia>()),
    ]);
    const seasonVisible = Boolean(
      experience.seasonality && experience.seasonSourceNote && experience.seasonReviewedAt,
    );
    return (
      <article className="grid gap-8">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Experiences", href: "/experiences" },
            { name: experience.name },
          ]}
        />
        <JsonLd
          data={attractionData({
            name: experience.name,
            description: experience.summary,
            path: `/experiences/${experience.slug}`,
          })}
        />

        <header className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {experience.category.status === "PUBLISHED" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ocean/10 dark:bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ocean dark:text-[#9adbd5] border border-ocean/15 dark:border-white/15">
                {experience.category.name}
              </span>
            ) : null}
            {experience.seasonality ? (
              <span className="inline-flex items-center rounded-full bg-sand/80 dark:bg-white/5 px-3 py-1 text-xs font-medium text-muted dark:text-slate-300 border border-border-subtle dark:border-white/10">
                🗓️ {experience.seasonality}
              </span>
            ) : null}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-ocean dark:text-white tracking-tight leading-tight">
            {experience.name}
          </h1>
          <p className="max-w-[75ch] text-base sm:text-lg text-ink/80 dark:text-slate-200 font-light leading-relaxed">
            {experience.summary}
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Main Editorial Content Column */}
          <div className="grid content-start gap-8 lg:col-span-8">
            <DetailHero media={media.get(experience.id)} />

            <section className="grid gap-4">
              <h2 className="font-display text-2xl font-semibold text-ocean dark:text-white">
                Experience Overview
              </h2>
              <Prose text={experience.description} />
            </section>

            {/* Experience Guidance Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-3xl border border-border-subtle bg-white dark:bg-white/5 dark:border-white/10 p-6 shadow-1">
              {experience.durationGuidance ? (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Duration Guidance
                  </span>
                  <p className="font-medium text-ink dark:text-white text-sm">
                    {experience.durationGuidance}
                  </p>
                </div>
              ) : null}
              {experience.seasonality ? (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Optimal Season
                  </span>
                  <p className="font-medium text-ink dark:text-white text-sm">
                    {experience.seasonality}
                  </p>
                </div>
              ) : null}
              {experience.suitability ? (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Suitability
                  </span>
                  <p className="font-medium text-ink dark:text-white text-sm">
                    {experience.suitability}
                  </p>
                </div>
              ) : null}
              {experience.difficulty ? (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Difficulty Level
                  </span>
                  <p className="font-medium text-ink dark:text-white text-sm">
                    {experience.difficulty}
                  </p>
                </div>
              ) : null}
            </div>

            {experience.safetyNotes ? (
              <section className="grid gap-2 rounded-2xl bg-sand/60 dark:bg-white/5 p-5 border border-border-subtle dark:border-white/10">
                <h3 className="font-display text-lg font-semibold text-ocean dark:text-[#9adbd5]">
                  Safety Guidance
                </h3>
                <Prose text={experience.safetyNotes} />
              </section>
            ) : null}

            {experience.environmentalNotes ? (
              <section className="grid gap-2 rounded-2xl bg-sand/60 dark:bg-white/5 p-5 border border-border-subtle dark:border-white/10">
                <h3 className="font-display text-lg font-semibold text-ocean dark:text-[#9adbd5]">
                  Marine Conservation &amp; Protection
                </h3>
                <Prose text={experience.environmentalNotes} />
              </section>
            ) : null}

            <RelatedList title="Featured Resorts" items={places.resorts} />
            <RelatedList title="Atolls & Islands" items={places.islands} />
            <RelatedList title="Editorial Guides" items={guides} />
            <FaqList items={faqs} />
          </div>

          {/* Luxury Sidebar Column */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 grid gap-6 rounded-3xl border border-border-subtle bg-white dark:bg-white/5 dark:border-white/10 p-6 sm:p-7 shadow-2">
              <div className="space-y-1 border-b border-border-subtle dark:border-white/10 pb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-lagoon-ink dark:text-[#7ccdc6]">
                  Signature Maldivian Activity
                </span>
                <p className="font-display text-2xl font-bold text-ocean dark:text-white">
                  Curated Island Journey
                </p>
              </div>

              <div className="space-y-3 text-xs text-muted dark:text-slate-300">
                <p>
                  Every experience can be incorporated seamlessly into your bespoke resort reservation or private yacht itinerary.
                </p>
                <div className="rounded-2xl bg-sand dark:bg-black/20 p-4 space-y-2 border border-border-subtle/70 dark:border-white/10 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">Type:</span>
                    <span className="font-medium text-ink dark:text-white">{experience.category.name}</span>
                  </div>
                  {experience.durationGuidance ? (
                    <div className="flex justify-between">
                      <span className="text-muted">Duration:</span>
                      <span className="font-medium text-ink dark:text-white">{experience.durationGuidance}</span>
                    </div>
                  ) : null}
                  {experience.seasonality ? (
                    <div className="flex justify-between">
                      <span className="text-muted">Season:</span>
                      <span className="font-medium text-ink dark:text-white text-right max-w-[18ch] truncate">{experience.seasonality}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 pt-2">
                <a
                  href="/plan"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#083b4c] dark:bg-[#7ccdc6] dark:text-[#071318] px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-ocean/90 dark:hover:bg-[#9adbd5] transition-all hover:scale-102 active:scale-98"
                >
                  Plan Trip With This Experience &rarr;
                </a>
                <div className="flex justify-center">
                  <ListingActions entityType="EXPERIENCE" entityId={experience.id} save />
                </div>
              </div>

              <div className="border-t border-border-subtle dark:border-white/10 pt-4 text-xs text-slate-500 dark:text-slate-400">
                <p className="font-medium text-ink dark:text-white mb-1">
                  Private Charters &amp; Marine Biologists
                </p>
                <p className="leading-relaxed">
                  Private speedboat departures, sunrise photo expeditions, and private marine biologist charters can be requested directly through our concierge team.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </article>
    );
  } catch (error) {
    if (isNotFoundError(error)) throw error;
    logError(error instanceof Error ? error.message : "The experience could not be loaded.");
    return (
      <ErrorState title="Experience">
        <p>The experience could not be loaded.</p>
      </ErrorState>
    );
  }
}
