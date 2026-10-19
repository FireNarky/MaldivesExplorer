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
      <section className="surface-inverse full-bleed relative overflow-hidden bg-gradient-to-b from-ocean to-[#062936] text-sand">
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#2bbcd0_1px,transparent_1px)] [background-size:24px_24px]" />
        
        <div className="relative mx-auto grid w-full max-w-[90rem] gap-8 px-4 py-16 sm:py-24 lg:grid-cols-12 lg:px-8 lg:py-32">
          <div className="grid content-center gap-6 lg:col-span-9">
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sand backdrop-blur-md border border-white/15">
              <Sparkles size={14} className="text-coral" aria-hidden="true" />
              <span>Curated Maldivian Archipelago</span>
            </div>

            <h1 className="text-[clamp(2.5rem,1.2rem+4vw,4.5rem)] font-display font-medium leading-[1.08] tracking-[-0.025em] text-sand">
              Bespoke Luxury Stays Across the Maldives
            </h1>

            <p className="max-w-[56ch] text-lg sm:text-xl text-sand/90 font-light leading-relaxed">
              Curated private island sanctuaries, iconic overwater villas with lagoon slides,
              and verified transfers orchestrated by Maldivian travel specialists.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button asChild variant="conversion" className="rounded-full px-8 py-4 text-base shadow-2">
                <Link href="/plan">
                  <Compass aria-hidden="true" size={20} strokeWidth={2} />
                  Plan my journey
                </Link>
              </Button>
              <Button asChild variant="secondary" className="rounded-full px-7 py-4 text-base bg-white/10 text-sand border-white/20 hover:bg-white/20">
                <Link href="/resorts">
                  <Waves aria-hidden="true" size={18} strokeWidth={2} />
                  Explore Resorts
                </Link>
              </Button>
            </div>

            {/* Quick Stat Highlights */}
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/15 pt-8 sm:grid-cols-4">
              <div>
                <p className="font-display text-2xl sm:text-3xl font-semibold text-sand">1,192</p>
                <p className="text-xs text-sand/75 uppercase tracking-wider mt-0.5">Coral Islands</p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl font-semibold text-sand">26</p>
                <p className="text-xs text-sand/75 uppercase tracking-wider mt-0.5">Natural Atolls</p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl font-semibold text-sand">100%</p>
                <p className="text-xs text-sand/75 uppercase tracking-wider mt-0.5">Verified Transfers</p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl font-semibold text-sand">5-Star</p>
                <p className="text-xs text-sand/75 uppercase tracking-wider mt-0.5">Marine Sanctuaries</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Start Exploring Cards */}
      <section aria-labelledby="explore-heading" className="grid gap-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink">Explore the Maldives</p>
            <h2 id="explore-heading" className="text-3xl font-display">Begin Your Discovery</h2>
          </div>
          <Link href="/search" className="text-sm font-semibold text-lagoon-ink hover:underline">
            All categories &rarr;
          </Link>
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {entryPoints.map((item) => (
            <li key={item.href} className="group relative">
              <div className="flex h-full flex-col justify-between rounded-2xl border border-border-subtle bg-white p-6 shadow-1 transition-all duration-200 hover:-translate-y-1 hover:border-ocean/40 hover:shadow-2">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-mist text-lagoon-ink group-hover:bg-ocean group-hover:text-sand transition-colors">
                      <item.icon size={20} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted bg-sand px-2.5 py-1 rounded-full">
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
                <div className="mt-6 flex items-center text-xs font-semibold text-lagoon-ink group-hover:text-ocean">
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
      <section className="rounded-3xl border border-border-subtle bg-white p-8 lg:p-12 shadow-1">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink">The Maldives Explorer Standard</p>
          <h2 className="text-3xl font-display text-ocean mt-1">Why Discerning Travelers Plan With Us</h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {trustPillars.map((pillar) => (
            <div key={pillar.title} className="flex flex-col gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-mist text-lagoon-ink">
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
              <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink">Curated Knowledge</p>
              <h2 id="guides-heading" className="text-3xl font-display">Editorial Guides</h2>
            </div>
            <Link href="/guides" className="text-sm font-semibold text-lagoon-ink hover:underline">
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
            <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink">Guest Reflections</p>
            <h2 id="reviews-heading" className="text-3xl font-display">Verified Traveler Stories</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="flex flex-col justify-between rounded-2xl border border-border-subtle bg-white p-6 lg:p-8 shadow-1"
              >
                <div>
                  <div className="mb-3 flex items-center gap-1 text-[#e2b45f]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={18} fill="currentColor" aria-hidden="true" />
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
                      <Link href={`/resorts/${rev.resort.slug}`} className="text-lagoon-ink hover:underline">
                        Stayed at {rev.resort.name}
                      </Link>
                    ) : null}
                  </div>
                  <span className="flex items-center gap-1 text-success font-medium">
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
      <section className="surface-tint full-bleed bg-mist rounded-3xl">
        <div className="mx-auto grid w-full max-w-[90rem] gap-8 px-4 py-16 lg:px-8 lg:py-24">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink">Seamless Process</p>
            <h2 className="text-3xl font-display text-ocean mt-1">How Trip Planning Works</h2>
            <p className="text-muted mt-2">
              From your initial vision to your private seaplane touchdown, our specialists craft every detail.
            </p>
          </div>

          <ol className="grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-4 rounded-2xl bg-white p-8 shadow-1">
                <span className="flex items-center justify-between text-lagoon-ink">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-mist text-lagoon-ink">
                    <step.icon aria-hidden="true" size={24} strokeWidth={1.75} />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-muted bg-sand px-3 py-1 rounded-full">
                    Step {index + 1}
                  </span>
                </span>
                <h3 className="text-xl font-display text-ocean">{step.title}</h3>
                <p className="text-sm text-ink leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex justify-center">
            <Button asChild variant="conversion" className="rounded-full px-8 py-4 text-base shadow-2">
              <Link href="/plan">
                <Compass aria-hidden="true" size={20} strokeWidth={2} />
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
