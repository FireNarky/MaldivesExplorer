import type { Metadata } from "next";
import Link from "next/link";
import {
  Award,
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
import { FlyingTern } from "@/components/ui/flying-tern";
import { Button } from "@/components/ui/button";
import { ResortCard } from "@/components/patterns/resort-card";
import { ExperienceCard } from "@/components/patterns/experience-card";
import { GuideCard } from "@/components/patterns/guide-card";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { siteOrigin } from "@/lib/seo/site";
import { websiteSearchData } from "@/lib/seo/structured";
import { listPublishedResorts, listLeadResortImages } from "@/modules/catalog";
import { listTestimonials, type PublicReview } from "@/modules/reviews/service";
import { db } from "@/lib/db";
import { publishedPublic } from "@/modules/discovery/visibility";
import { listLeadMedia } from "@/modules/media";

export const metadata: Metadata = {
  ...publicMetadata({
    title: "Maldives Explorer · Curated Luxury Resorts & Islands",
    description:
      "Discover hand-curated private islands, iconic overwater villas with slides, and bespoke journeys across the Maldives.",
    path: "/",
  }),
  title: { absolute: "Maldives Explorer · Bespoke Luxury Island Travel" },
};

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
    text: "Iconic overwater pool villas, private sandbanks, and barefoot sustainable private islands.",
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
    title: "Direct Transfer Coordination",
    text: "Every seaplane and speedboat transfer is synchronized directly with resort marine desks.",
  },
  {
    icon: Award,
    title: "Direct Resort Relationships",
    text: "We liaise directly with Maldives resort management to request preferred villa placement and tailored inclusions.",
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

export default async function HomePage() {
  let resorts: Awaited<ReturnType<typeof listPublishedResorts>> = [];
  let leadImages = new Map<string, { id: string; altText: string }>();
  let experiences: ExperienceItem[] = [];
  let guides: GuideItem[] = [];
  let reviews: PublicReview[] = [];

  try {
    const resortsData = await listPublishedResorts();
    const [imagesData, expData, guidesData, reviewsData] = await Promise.all([
      listLeadResortImages(resortsData.map((r) => r.id)),
      db.experience.findMany({
        where: publishedPublic(),
        include: { category: true },
        take: 3,
        orderBy: { name: "asc" },
      }),
      db.article.findMany({
        where: publishedPublic(),
        include: { category: true, author: true },
        take: 2,
        orderBy: { publishedAt: "desc" },
      }),
      listTestimonials(),
    ]);

    resorts = resortsData;
    leadImages = imagesData;
    experiences = expData;
    guides = guidesData;
    reviews = reviewsData.slice(0, 3);
  } catch (error) {
    logError(error instanceof Error ? error.message : "Homepage data loading error");
    reviews = [];
  }

  // Get experience images
  const expImageMap = await listLeadMedia(
    "EXPERIENCE",
    experiences.map((e) => e.id),
  );

  // Get guide images
  const guideImageMap = await listLeadMedia(
    "ARTICLE",
    guides.map((g) => g.id),
  );

  return (
    <div className="-mt-8 grid gap-20 lg:gap-28">
      <JsonLd data={websiteSearchData(siteOrigin())} />

      {/* Hero Section */}
      <section className="surface-inverse full-bleed relative overflow-hidden bg-gradient-to-b from-[#083b4c] via-[#083b4c]/95 to-[#062936] text-white dark:from-[#061820] dark:via-[#071d27] dark:to-[#041017]">
        {/* Subtle Luxury Lagoon Background Photo */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('/images/hero-maldives.jpg')] bg-cover bg-center mix-blend-overlay" />
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#2bbcd0_1.5px,transparent_1.5px)] [background-size:28px_28px]" />
        <div className="pointer-events-none absolute -right-24 top-1/4 size-96 rounded-full bg-lagoon/10 dark:bg-cyan-400/10 blur-3xl animate-pulse-glow" />
        <div className="pointer-events-none absolute -left-24 bottom-10 size-80 rounded-full bg-coral/10 blur-3xl animate-pulse-glow" />

        {/* Flying tern */}
        <FlyingTern />

        <div className="relative mx-auto grid w-full max-w-[90rem] 2xl:max-w-[105rem] 3xl:max-w-[115rem] items-center gap-10 px-4 py-16 sm:py-24 lg:grid-cols-12 lg:px-8 lg:py-32 2xl:px-12">
          <div className="grid content-center gap-6 lg:col-span-8">
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md border border-white/20 shadow-sm animate-in fade-in duration-500">
              <Sparkles size={14} className="text-coral animate-spin-slow" aria-hidden="true" />
              <span>Curated Maldivian Archipelago</span>
            </div>

            <h1 className="text-[clamp(2.5rem,1.2rem+4vw,4.5rem)] font-display font-medium leading-[1.08] tracking-[-0.025em] text-white animate-in fade-in slide-in-from-bottom-2 duration-500">
              Bespoke Luxury Stays Across the Maldives
            </h1>

            <p className="max-w-[56ch] text-lg sm:text-xl text-slate-200 font-light leading-relaxed animate-in fade-in slide-in-from-bottom-3 duration-500">
              Curated private islands, iconic overwater villas with lagoon slides, and direct
              transfer coordination orchestrated by Maldivian travel specialists.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Button
                asChild
                variant="conversion"
                className="rounded-full px-8 py-4 text-base shadow-2 group transition-all hover:scale-105 active:scale-95"
              >
                <Link href="/plan">
                  <Compass
                    aria-hidden="true"
                    size={20}
                    strokeWidth={2}
                    className="transition-transform group-hover:rotate-45"
                  />
                  Plan my trip
                </Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                className="rounded-full px-7 py-4 text-base bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
              >
                <Link href="/resorts">
                  <Waves aria-hidden="true" size={18} strokeWidth={2} />
                  Explore Resorts
                </Link>
              </Button>
            </div>

            {/* Mobile preview reuses the same CSS background URL as the hero plane (one fetch). */}
            <div className="lg:hidden mt-2 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md flex items-center gap-3.5">
              <div
                className="size-16 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-[url('/images/hero-maldives.jpg')] bg-cover bg-center"
                role="img"
                aria-label="Maldives overwater resort"
              />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-cyan-300 font-semibold">
                  Bespoke Island Travel
                </p>
                <p className="text-sm font-display text-white truncate">
                  Direct Seaplane &amp; Overwater Villa Quotes
                </p>
              </div>
            </div>

            {/* Quick Stat Highlights - Geography figures */}
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/15 pt-8 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/5 p-3.5 backdrop-blur-sm border border-white/10 transition-transform hover:-translate-y-1">
                <p className="font-display text-2xl sm:text-3xl font-semibold text-white">1,192</p>
                <p className="text-xs text-slate-300 uppercase tracking-wider mt-0.5">
                  Coral Islands
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3.5 backdrop-blur-sm border border-white/10 transition-transform hover:-translate-y-1">
                <p className="font-display text-2xl sm:text-3xl font-semibold text-white">26</p>
                <p className="text-xs text-slate-300 uppercase tracking-wider mt-0.5">
                  Natural Atolls
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3.5 backdrop-blur-sm border border-white/10 transition-transform hover:-translate-y-1">
                <p className="font-display text-2xl sm:text-3xl font-semibold text-white">170+</p>
                <p className="text-xs text-slate-300 uppercase tracking-wider mt-0.5">
                  Private Resorts
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3.5 backdrop-blur-sm border border-white/10 transition-transform hover:-translate-y-1">
                <p className="font-display text-2xl sm:text-3xl font-semibold text-white">40+</p>
                <p className="text-xs text-slate-300 uppercase tracking-wider mt-0.5">
                  Marine Reserves
                </p>
              </div>
            </div>
          </div>

          {/* Floating Luxury Itinerary Card */}
          <div className="hidden lg:col-span-4 lg:block">
            <div className="relative mx-auto max-w-sm rounded-3xl border border-white/20 bg-white/10 p-6 shadow-3 backdrop-blur-xl animate-float">
              <div className="flex items-center justify-between border-b border-white/15 pb-4">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/90">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  Dedicated Concierge
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white border border-white/20">
                  Private Service
                </span>
              </div>
              <div className="space-y-4 py-4">
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-300">
                    Atoll Itinerary
                  </span>
                  <p className="font-display text-lg font-medium text-white">
                    Baa Atoll &amp; North Malé
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-white/10 p-2.5">
                    <span className="block text-xs uppercase text-slate-300">Seaplane</span>
                    <span className="font-semibold text-white">TMA Twin Otter</span>
                  </div>
                  <div className="rounded-xl bg-white/10 p-2.5">
                    <span className="block text-xs uppercase text-slate-300">Villa Class</span>
                    <span className="font-semibold text-white">Overwater Pool</span>
                  </div>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-xs text-white/90">
                  <p className="flex items-center gap-1.5 font-medium">
                    <Sparkles size={13} className="text-amber-300" />
                    Complimentary Privileges:
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    Sunset Champagne Cruise, Half-Board Dine-Around, &amp; Marine Biologist Snorkel
                  </p>
                </div>
              </div>
              <Button
                asChild
                variant="conversion"
                className="w-full rounded-xl py-2.5 text-xs font-semibold shadow-sm"
              >
                <Link href="/plan">Plan my trip &rarr;</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Start Exploring Cards */}
      <section aria-labelledby="explore-heading" className="grid gap-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">
              Explore the Maldives
            </p>
            <h2 id="explore-heading" className="text-3xl font-display text-ocean">
              Begin Your Discovery
            </h2>
          </div>
          <Link
            href="/search"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-lagoon-ink dark:text-cyan-400 hover:underline py-2"
          >
            All categories &rarr;
          </Link>
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {entryPoints.map((item) => (
            <li key={item.href} className="group relative">
              <div className="flex h-full flex-col justify-between rounded-2xl border border-border-subtle bg-white dark:bg-white/5 dark:border-white/10 p-6 shadow-1 transition-all duration-300 hover:-translate-y-2 hover:border-ocean/50 dark:hover:border-cyan-400/50 hover:shadow-2">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300 group-hover:bg-ocean group-hover:text-white transition-colors">
                      <item.icon size={20} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted dark:text-slate-200 bg-sand dark:bg-white/10 px-2.5 py-1 rounded-full border border-border-subtle/50">
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
              <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink">
                Handpicked Resorts
              </p>
              <h2 id="featured-resorts-heading" className="text-3xl font-display">
                Featured Luxury Resorts
              </h2>
              <p className="text-base text-muted mt-1">
                Personally curated for architectural beauty, world-class diving, and discreet island
                service.
              </p>
            </div>
            <Button asChild variant="secondary" className="hidden sm:inline-flex rounded-full">
              <Link href="/resorts">View all {resorts.length} resorts &rarr;</Link>
            </Button>
          </div>

          {/* Sideways swipe carousel on phones, responsive grid on desktop */}
          <div className="flex overflow-x-auto pb-4 gap-4 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0 scrollbar-none">
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
                <div
                  key={resort.id}
                  className="min-w-[82vw] max-w-[85vw] snap-center sm:min-w-0 sm:max-w-none"
                >
                  <ResortCard
                    resort={{
                      slug: resort.slug,
                      name: resort.name,
                      summary: resort.summary,
                      location: location || null,
                      image,
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="sm:hidden flex justify-center pt-1">
            <Button
              asChild
              variant="secondary"
              className="w-full rounded-xl py-3 text-sm font-semibold"
            >
              <Link href="/resorts">View all {resorts.length} resorts &rarr;</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {/* Signature Experiences */}
      {experiences.length > 0 ? (
        <section aria-labelledby="experiences-heading" className="grid gap-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink">
                Unforgettable Ocean Encounters
              </p>
              <h2 id="experiences-heading" className="text-3xl font-display">
                Signature Experiences
              </h2>
              <p className="text-base text-muted mt-1">
                Swim with gentle mantas, dive protected whale shark corridors, and feast beneath the
                waves.
              </p>
            </div>
            <Link
              href="/experiences"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-lagoon-ink dark:text-cyan-400 hover:underline py-2"
            >
              All experiences &rarr;
            </Link>
          </div>

          {/* Sideways swipe carousel on phones, responsive grid on desktop */}
          <div className="flex overflow-x-auto pb-4 gap-4 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0 scrollbar-none">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                className="min-w-[82vw] max-w-[85vw] snap-center sm:min-w-0 sm:max-w-none"
              >
                <ExperienceCard
                  item={{
                    id: exp.id,
                    name: exp.name,
                    slug: exp.slug,
                    summary: exp.summary,
                    durationGuidance: exp.durationGuidance,
                    seasonality: exp.seasonality,
                    categoryName: exp.category?.name,
                    image: expImageMap.get(exp.id) ?? null,
                  }}
                />
              </div>
            ))}
          </div>

          <div className="sm:hidden flex justify-center pt-1">
            <Button
              asChild
              variant="secondary"
              className="w-full rounded-xl py-3 text-sm font-semibold"
            >
              <Link href="/experiences">View all experiences &rarr;</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {/* Why Choose Us / Trust Banner */}
      <section className="rounded-3xl border border-border-subtle bg-white dark:bg-white/5 dark:border-white/10 p-8 lg:p-12 shadow-1">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">
            The Maldives Explorer Standard
          </p>
          <h2 className="text-3xl font-display text-ocean mt-1">
            Why Discerning Travelers Plan With Us
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {trustPillars.map((pillar) => (
            <div
              key={pillar.title}
              className="group flex flex-col gap-3 rounded-2xl p-4 transition-all hover:bg-mist/40 dark:hover:bg-white/5"
            >
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
              <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">
                Curated Knowledge
              </p>
              <h2 id="guides-heading" className="text-3xl font-display text-ocean">
                Editorial Guides
              </h2>
            </div>
            <Link
              href="/guides"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-lagoon-ink dark:text-cyan-400 hover:underline py-2"
            >
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
                  image: guideImageMap.get(guide.id) ?? null,
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Guest Reflections & Stories */}
      {reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className="grid gap-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">
              Guest Reflections
            </p>
            <h2 id="reviews-heading" className="text-3xl font-display text-ocean">
              Traveler Stories
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="group flex flex-col justify-between rounded-2xl border border-border-subtle bg-white dark:bg-white/5 dark:border-white/10 p-6 lg:p-8 shadow-1 transition-all duration-300 hover:-translate-y-1 hover:border-ocean/40 dark:hover:border-cyan-400/40 hover:shadow-2"
              >
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                    {rev.label}
                  </p>
                  {rev.rating ? (
                    <p className="mb-2 text-xs text-muted">
                      {rev.rating} out of 5{rev.ratingBasis ? ` (${rev.ratingBasis})` : ""}
                    </p>
                  ) : null}
                  <blockquote className="mb-4 text-base italic text-ink leading-relaxed">
                    &ldquo;{rev.body}&rdquo;
                  </blockquote>
                </div>
                <div className="border-t border-border-subtle/80 pt-4 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-ink">{rev.displayName}</p>
                    {rev.resortHref && rev.resortName ? (
                      <Link
                        href={rev.resortHref}
                        className="text-lagoon-ink dark:text-cyan-400 hover:underline"
                      >
                        {rev.resortName}
                      </Link>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted font-medium">{rev.label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* How Planning Works - Compact, clean steps */}
      <section className="surface-tint full-bleed bg-mist/60 dark:bg-white/[0.03] border-y border-border-subtle/80 dark:border-white/10">
        <div className="mx-auto grid w-full max-w-[90rem] 2xl:max-w-[105rem] 3xl:max-w-[115rem] gap-8 px-4 py-12 lg:px-8 lg:py-20 2xl:px-12">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">
              Seamless Process
            </p>
            <h2 className="text-3xl font-display text-ocean mt-1">How Trip Planning Works</h2>
            <p className="text-muted mt-2">
              From your initial vision to your private seaplane touchdown, our specialists craft
              every detail.
            </p>
          </div>

          <ol className="grid gap-4 md:gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="group flex flex-col gap-3 rounded-2xl border border-border-subtle/80 bg-white dark:bg-white/5 dark:border-white/10 p-5 sm:p-7 shadow-1 transition-all duration-300 hover:-translate-y-1 hover:border-ocean/50 dark:hover:border-cyan-400/50 hover:shadow-2"
              >
                <span className="flex items-center justify-between text-lagoon-ink">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300 transition-colors group-hover:bg-ocean group-hover:text-white">
                    <step.icon aria-hidden="true" size={22} strokeWidth={1.75} />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-muted dark:text-slate-200 bg-sand dark:bg-white/10 px-2.5 py-0.5 rounded-full border border-border-subtle/50">
                    Step {index + 1}
                  </span>
                </span>
                <h3 className="text-lg sm:text-xl font-display text-ocean">{step.title}</h3>
                <p className="text-sm text-ink leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-2 flex justify-center">
            <Button
              asChild
              variant="conversion"
              className="rounded-full px-8 py-4 text-base shadow-2 group transition-all hover:scale-105 active:scale-95"
            >
              <Link href="/plan">
                <Compass
                  aria-hidden="true"
                  size={20}
                  strokeWidth={2}
                  className="transition-transform group-hover:rotate-45"
                />
                Plan my trip
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
