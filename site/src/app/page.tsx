import type { Metadata } from "next";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  ClipboardList,
  Compass,
  FileText,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Waves,
} from "lucide-react";
import { JsonLd } from "@/components/discovery/json-ld";
import { Button } from "@/components/ui/button";
import { ResortCard } from "@/components/patterns/resort-card";
import { ExperienceCard } from "@/components/patterns/experience-card";
import { GuideCard } from "@/components/patterns/guide-card";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { siteOrigin } from "@/lib/seo/site";
import { websiteSearchData } from "@/lib/seo/structured";
import { listPublishedResorts, listLeadResortImages } from "@/modules/catalog";
import { listPublishedHomepageModules } from "@/modules/content";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  ...publicMetadata({
    title: "Maldives Explorer · Curated Luxury Resorts & Islands",
    description: "Discover hand-curated private islands, iconic overwater villas with slides, and bespoke journeys across the Maldives.",
    path: "/",
  }),
  title: { absolute: "Maldives Explorer · Bespoke Luxury Island Travel" },
};

function moduleText(config: unknown): string {
  if (!config || typeof config !== "object" || Array.isArray(config) || !("text" in config))
    return "";
  return typeof config.text === "string" ? config.text.trim() : "";
}

const entryPoints = [
  {
    href: "/destinations",
    title: "Atolls & Islands",
    badge: "26 Atolls",
    icon: MapPin,
    text: "From UNESCO Biosphere Reserves to untouched northern lagoons, explore the geography.",
  },
  {
    href: "/resorts",
    title: "Luxury Resorts",
    badge: "Curated",
    icon: Waves,
    text: "Iconic overwater pool villas, private sandbanks, and barefoot sustainable sanctuaries.",
  },
  {
    href: "/experiences",
    title: "Signature Experiences",
    badge: "Bucket List",
    icon: Compass,
    text: "Hanifaru Bay manta gatherings, whale shark safaris, and 5.8 undersea dining.",
  },
  {
    href: "/offers",
    title: "Curated Offers",
    badge: "Exclusive",
    icon: Sparkles,
    text: "Complimentary seaplane flights, half-board upgrades, and extended stay privileges.",
  },
] as const;

const steps = [
  {
    icon: ClipboardList,
    title: "Share your travel vision",
    text: "Select your preferred dates, island styles, and travel companions in our step-by-step trip planner.",
  },
  {
    icon: Compass,
    title: "Curated options by island specialists",
    text: "Our Maldivian travel directors review your wishes and negotiate directly with resort partners.",
  },
  {
    icon: FileText,
    title: "All-inclusive written quote",
    text: "Receive an itemized written quote covering luxury accommodation, sea transfers, and tailored inclusions.",
  },
] as const;

const trustPillars = [
  {
    icon: ShieldCheck,
    title: "100% Verified Transfers",
    text: "Every seaplane and speedboat transfer is verified directly with resort marine coordinators.",
  },
  {
    icon: Award,
    title: "Direct Resort Relationships",
    text: "No middle agents. We work directly with Maldives general managers to guarantee prime villa placement.",
  },
  {
    icon: Star,
    title: "Objective Marine Advice",
    text: "Independent insights on house reef quality, seasonal manta migrations, and monsoon currents.",
  },
];

type ExperienceItem = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  durationGuidance: string | null;
  seasonality: string | null;
  category: { name: string } | null;
};

type GuideItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: { name: string } | null;
  author: { name: string } | null;
};

type ReviewItem = {
  id: string;
  body: string;
  displayName: string;
  resort: { name: string; slug: string } | null;
};

export default async function HomePage() {
  let resorts: Awaited<ReturnType<typeof listPublishedResorts>> = [];
  let leadImages = new Map<string, { id: string; altText: string }>();
  let experiences: ExperienceItem[] = [];
  let guides: GuideItem[] = [];
  let reviews: ReviewItem[] = [];
  let modules: Awaited<ReturnType<typeof listPublishedHomepageModules>> = [];

  try {
    const resortsData = await listPublishedResorts();
    const [imagesData, expData, guidesData, reviewsData, cmsModules] = await Promise.all([
      listLeadResortImages(resortsData.map((r) => r.id)),
      db.experience.findMany({
        where: { status: "PUBLISHED" },
        include: { category: true },
        take: 3,
        orderBy: { name: "asc" },
      }),
      db.article.findMany({
        where: { status: "PUBLISHED" },
        include: { category: true, author: true },
        take: 2,
        orderBy: { publishedAt: "desc" },
      }),
      db.review.findMany({
        where: { featured: true, publishedAt: { not: null } },
        include: { resort: { select: { name: true, slug: true } } },
        take: 2,
      }),
      listPublishedHomepageModules(),
    ]);

    resorts = resortsData;
    leadImages = imagesData;
    experiences = expData;
    guides = guidesData;
    reviews = reviewsData;
    modules = cmsModules;
  } catch (error) {
    logError(error instanceof Error ? error.message : "Homepage data loading error");
  }

  // Get experience images
  const expMediaLinks = await db.mediaLink.findMany({
    where: {
      ownerType: "EXPERIENCE",
      ownerId: { in: experiences.map((e) => e.id) },
    },
    include: { media: { select: { id: true, altText: true } } },
  });
  const expImageMap = new Map(expMediaLinks.map((l) => [l.ownerId, l.media]));

  // Get guide images
  const guideMediaLinks = await db.mediaLink.findMany({
    where: {
      ownerType: "ARTICLE",
      ownerId: { in: guides.map((g) => g.id) },
    },
    include: { media: { select: { id: true, altText: true } } },
  });
  const guideImageMap = new Map(guideMediaLinks.map((l) => [l.ownerId, l.media]));

  return (
    <div className="-mt-8 grid gap-20 lg:gap-28">
      <JsonLd data={websiteSearchData(siteOrigin())} />

      {/* Hero Section */}
      <section className="surface-inverse full-bleed relative overflow-hidden bg-gradient-to-b from-[#083b4c] via-[#083b4c]/95 to-[#062936] text-sand dark:from-[#061820] dark:via-[#071d27] dark:to-[#041017]">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#2bbcd0_1.5px,transparent_1.5px)] [background-size:28px_28px]" />
        <div className="pointer-events-none absolute -right-24 top-1/4 size-96 rounded-full bg-lagoon/10 dark:bg-cyan-400/10 blur-3xl animate-pulse-glow" />
        <div className="pointer-events-none absolute -left-24 bottom-10 size-80 rounded-full bg-coral/10 blur-3xl animate-pulse-glow" />
        
        <div className="relative mx-auto grid w-full max-w-[90rem] items-center gap-10 px-4 py-16 sm:py-24 lg:grid-cols-12 lg:px-8 lg:py-32">
          <div className="grid content-center gap-6 lg:col-span-8">
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sand backdrop-blur-md border border-white/20 shadow-sm animate-in fade-in duration-500">
              <Sparkles size={14} className="text-coral animate-spin-slow" aria-hidden="true" />
              <span>Curated Maldivian Archipelago</span>
            </div>

            <h1 className="text-[clamp(2.5rem,1.2rem+4vw,4.5rem)] font-display font-medium leading-[1.08] tracking-[-0.025em] text-sand animate-in fade-in slide-in-from-bottom-2 duration-500">
              Bespoke Luxury Stays Across the Maldives
            </h1>

            <p className="max-w-[56ch] text-lg sm:text-xl text-sand/90 font-light leading-relaxed animate-in fade-in slide-in-from-bottom-3 duration-500">
              Curated private island sanctuaries, iconic overwater villas with lagoon slides,
              and verified transfers orchestrated by Maldivian travel specialists.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Button asChild variant="conversion" className="rounded-full px-8 py-4 text-base shadow-2 group transition-all hover:scale-105 active:scale-95">
                <Link href="/plan">
                  <Compass aria-hidden="true" size={20} strokeWidth={2} className="transition-transform group-hover:rotate-45" />
                  Plan my journey
                </Link>
              </Button>
              <Button asChild variant="secondary" className="rounded-full px-7 py-4 text-base bg-white/10 text-sand border-white/20 hover:bg-white/20 backdrop-blur-md transition-all hover:scale-105 active:scale-95">
                <Link href="/resorts">
                  <Waves aria-hidden="true" size={18} strokeWidth={2} />
                  Explore Resorts
                </Link>
              </Button>
            </div>

            {/* Quick Stat Highlights */}
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/15 pt-8 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/5 p-3.5 backdrop-blur-sm border border-white/10 transition-transform hover:-translate-y-1">
                <p className="font-display text-2xl sm:text-3xl font-semibold text-sand">1,192</p>
                <p className="text-xs text-sand/75 uppercase tracking-wider mt-0.5">Coral Islands</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3.5 backdrop-blur-sm border border-white/10 transition-transform hover:-translate-y-1">
                <p className="font-display text-2xl sm:text-3xl font-semibold text-sand">26</p>
                <p className="text-xs text-sand/75 uppercase tracking-wider mt-0.5">Natural Atolls</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3.5 backdrop-blur-sm border border-white/10 transition-transform hover:-translate-y-1">
                <p className="font-display text-2xl sm:text-3xl font-semibold text-sand">100%</p>
                <p className="text-xs text-sand/75 uppercase tracking-wider mt-0.5">Verified Transfers</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3.5 backdrop-blur-sm border border-white/10 transition-transform hover:-translate-y-1">
                <p className="font-display text-2xl sm:text-3xl font-semibold text-sand">5-Star</p>
                <p className="text-xs text-sand/75 uppercase tracking-wider mt-0.5">Sanctuaries</p>
              </div>
            </div>
          </div>

          {/* Floating Luxury Itinerary Card */}
          <div className="hidden lg:col-span-4 lg:block">
            <div className="relative mx-auto max-w-sm rounded-3xl border border-white/20 bg-white/10 p-6 shadow-3 backdrop-blur-xl animate-float">
              <div className="flex items-center justify-between border-b border-white/15 pb-4">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sand/90">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  Island Concierge Active
                </span>
                <span className="rounded-full bg-coral/30 px-2.5 py-0.5 text-[11px] font-bold text-coral-hover border border-coral/40">
                  VIP PASS
                </span>
              </div>
              <div className="space-y-4 py-4">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-sand/70">Atoll Itinerary</span>
                  <p className="font-display text-lg font-medium text-sand">Baa Atoll &amp; North Malé</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-white/10 p-2.5">
                    <span className="block text-[10px] uppercase text-sand/60">Seaplane</span>
                    <span className="font-semibold text-sand">TMA Twin Otter</span>
                  </div>
                  <div className="rounded-xl bg-white/10 p-2.5">
                    <span className="block text-[10px] uppercase text-sand/60">Villa Class</span>
                    <span className="font-semibold text-sand">Overwater Pool</span>
                  </div>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-xs text-sand/90">
                  <p className="flex items-center gap-1.5 font-medium">
                    <Sparkles size={13} className="text-amber-300" />
                    Complimentary Benefits:
                  </p>
                  <p className="mt-1 text-[11px] text-sand/75">
                    Sunset Champagne Cruise, Half-Board Dine-Around, &amp; Marine Biologist Snorkel
                  </p>
                </div>
              </div>
              <Button asChild variant="conversion" className="w-full rounded-xl py-2.5 text-xs font-semibold shadow-sm">
                <Link href="/plan">Build Your Custom Quote &rarr;</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Start Exploring Cards */}
      <section aria-labelledby="explore-heading" className="grid gap-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">Explore the Maldives</p>
            <h2 id="explore-heading" className="text-3xl font-display text-ocean">Begin Your Discovery</h2>
          </div>
          <Link href="/search" className="text-sm font-semibold text-lagoon-ink dark:text-cyan-400 hover:underline">
            All categories &rarr;
          </Link>
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {entryPoints.map((item) => (
            <li key={item.href} className="group relative">
              <div className="flex h-full flex-col justify-between rounded-2xl border border-border-subtle bg-white dark:bg-white/5 dark:border-white/10 p-6 shadow-1 transition-all duration-300 hover:-translate-y-2 hover:border-ocean/50 dark:hover:border-cyan-400/50 hover:shadow-2">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300 group-hover:bg-ocean group-hover:text-sand transition-colors">
                      <item.icon size={20} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted dark:text-sand/80 bg-sand dark:bg-white/10 px-2.5 py-1 rounded-full border border-border-subtle/50">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-display text-ocean mb-2">
                    <Link href={item.href} className="after:absolute after:inset-0 hover:underline">
                      {item.title}
                    </Link>
                  </h3>
                  <p className="text-sm text-ink leading-relaxed">{item.text}</p>
                </div>
                <div className="mt-6 flex items-center text-xs font-semibold text-lagoon-ink dark:text-cyan-400 group-hover:translate-x-1 transition-transform">
                  Explore &rarr;
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Featured Luxury Resorts */}
      {resorts.length > 0 ? (
        <section aria-labelledby="featured-resorts-heading" className="grid gap-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink">Handpicked Sanctuaries</p>
              <h2 id="featured-resorts-heading" className="text-3xl font-display">Featured Luxury Resorts</h2>
              <p className="text-base text-muted mt-1">
                Personally curated for architectural beauty, world-class diving, and discreet island service.
              </p>
            </div>
            <Button asChild variant="secondary" className="self-start sm:self-auto rounded-full">
              <Link href="/resorts">View all {resorts.length} resorts &rarr;</Link>
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {resorts.slice(0, 6).map((resort) => {
              const location = [
                resort.island.status === "PUBLISHED" ? resort.island.name : null,
                resort.island.status === "PUBLISHED" && resort.island.atoll.status === "PUBLISHED"
                  ? resort.island.atoll.name
                  : null,
              ]
                .filter(Boolean)
                .join(", ");
              const image = leadImages.get(resort.id) ?? null;

              return (
                <ResortCard
                  key={resort.id}
                  resort={{
                    slug: resort.slug,
                    name: resort.name,
                    summary: resort.summary,
                    location: location || null,
                    image,
                  }}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Signature Experiences */}
      {experiences.length > 0 ? (
        <section aria-labelledby="experiences-heading" className="grid gap-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink">Unforgettable Ocean Encounters</p>
              <h2 id="experiences-heading" className="text-3xl font-display">Signature Experiences</h2>
              <p className="text-base text-muted mt-1">
                Swim with gentle mantas, dive protected whale shark corridors, and feast beneath the waves.
              </p>
            </div>
            <Link href="/experiences" className="text-sm font-semibold text-lagoon-ink hover:underline">
              All experiences &rarr;
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((exp) => (
              <ExperienceCard
                key={exp.id}
                item={{
                  id: exp.id,
                  name: exp.name,
                  slug: exp.slug,
                  summary: exp.summary,
                  durationGuidance: exp.durationGuidance,
                  seasonality: exp.seasonality,
                  categoryName: exp.category?.name,
                  image: expImageMap.get(exp.id)
                    ? { id: expImageMap.get(exp.id)!.id, altText: expImageMap.get(exp.id)!.altText ?? exp.name }
                    : null,
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Why Choose Us / Trust Banner */}
      <section className="rounded-3xl border border-border-subtle bg-white dark:bg-white/5 dark:border-white/10 p-8 lg:p-12 shadow-1">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">The Maldives Explorer Standard</p>
          <h2 className="text-3xl font-display text-ocean mt-1">Why Discerning Travelers Plan With Us</h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {trustPillars.map((pillar) => (
            <div key={pillar.title} className="group flex flex-col gap-3 rounded-2xl p-4 transition-all hover:bg-mist/40 dark:hover:bg-white/5">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300 shadow-sm transition-transform group-hover:scale-110">
                <pillar.icon size={24} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="text-xl font-display text-ocean">{pillar.title}</h3>
              <p className="text-sm text-ink leading-relaxed">{pillar.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Editorial Travel Guides */}
      {guides.length > 0 ? (
        <section aria-labelledby="guides-heading" className="grid gap-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">Curated Knowledge</p>
              <h2 id="guides-heading" className="text-3xl font-display text-ocean">Editorial Guides</h2>
            </div>
            <Link href="/guides" className="text-sm font-semibold text-lagoon-ink dark:text-cyan-400 hover:underline">
              Browse all guides &rarr;
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {guides.map((guide) => (
              <GuideCard
                key={guide.id}
                item={{
                  id: guide.id,
                  title: guide.title,
                  slug: guide.slug,
                  excerpt: guide.excerpt,
                  categoryName: guide.category?.name,
                  authorName: guide.author?.name,
                  image: guideImageMap.get(guide.id)
                    ? { id: guideImageMap.get(guide.id)!.id, altText: guideImageMap.get(guide.id)!.altText ?? guide.title }
                    : null,
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Verified Reviews */}
      {reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className="grid gap-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">Guest Reflections</p>
            <h2 id="reviews-heading" className="text-3xl font-display text-ocean">Verified Traveler Stories</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="group flex flex-col justify-between rounded-2xl border border-border-subtle bg-white dark:bg-white/5 dark:border-white/10 p-6 lg:p-8 shadow-1 transition-all duration-300 hover:-translate-y-1 hover:border-ocean/40 dark:hover:border-cyan-400/40 hover:shadow-2"
              >
                <div>
                  <div className="mb-3 flex items-center gap-1 text-[#e2b45f]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={18} fill="currentColor" aria-hidden="true" className="transition-transform group-hover:scale-110" />
                    ))}
                  </div>
                  <blockquote className="mb-4 text-base italic text-ink leading-relaxed">
                    &ldquo;{rev.body}&rdquo;
                  </blockquote>
                </div>
                <div className="border-t border-border-subtle/80 pt-4 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-ink">{rev.displayName}</p>
                    {rev.resort ? (
                      <Link href={`/resorts/${rev.resort.slug}`} className="text-lagoon-ink dark:text-cyan-400 hover:underline">
                        Stayed at {rev.resort.name}
                      </Link>
                    ) : null}
                  </div>
                  <span className="flex items-center gap-1 text-success dark:text-emerald-400 font-medium">
                    <CheckCircle2 size={14} aria-hidden="true" />
                    Verified Stay
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* How Planning Works */}
      <section className="surface-tint full-bleed bg-mist/60 dark:bg-white/[0.03] dark:border-y dark:border-white/10 rounded-3xl">
        <div className="mx-auto grid w-full max-w-[90rem] gap-8 px-4 py-16 lg:px-8 lg:py-24">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">Seamless Process</p>
            <h2 className="text-3xl font-display text-ocean mt-1">How Trip Planning Works</h2>
            <p className="text-muted mt-2">
              From your initial vision to your private seaplane touchdown, our specialists craft every detail.
            </p>
          </div>

          <ol className="grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="group flex flex-col gap-4 rounded-2xl border border-border-subtle/80 bg-white dark:bg-white/5 dark:border-white/10 p-8 shadow-1 transition-all duration-300 hover:-translate-y-2 hover:border-ocean/50 dark:hover:border-cyan-400/50 hover:shadow-2">
                <span className="flex items-center justify-between text-lagoon-ink">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300 transition-colors group-hover:bg-ocean group-hover:text-sand">
                    <step.icon aria-hidden="true" size={24} strokeWidth={1.75} />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-muted dark:text-sand/80 bg-sand dark:bg-white/10 px-3 py-1 rounded-full border border-border-subtle/50">
                    Step {index + 1}
                  </span>
                </span>
                <h3 className="text-xl font-display text-ocean">{step.title}</h3>
                <p className="text-sm text-ink leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex justify-center">
            <Button asChild variant="conversion" className="rounded-full px-8 py-4 text-base shadow-2 group transition-all hover:scale-105 active:scale-95">
              <Link href="/plan">
                <Compass aria-hidden="true" size={20} strokeWidth={2} className="transition-transform group-hover:rotate-45" />
                Start planning your stay
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {modules.length > 0 ? (
        <section aria-label="Additional Information" className="grid gap-6 border-t border-border-subtle pt-8">
          {modules.map((module) => {
            const text = moduleText(module.config);
            if (!text) return null;
            return (
              <div key={module.id} className="max-w-[65ch] space-y-2">
                <h3 className="text-xl font-display text-ocean">{module.title ?? module.moduleType}</h3>
                <p className="text-sm text-ink leading-relaxed">{text}</p>
              </div>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
