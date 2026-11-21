import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plane } from "lucide-react";
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
    title: "Thari Ventures · Curated Luxury Resorts & Islands",
    description:
      "Discover hand-curated private islands, iconic overwater villas with slides, and bespoke journeys across the Maldives.",
    path: "/",
  }),
  title: { absolute: "Thari Ventures · Bespoke Luxury Island Travel" },
};

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

  const featured = reviews[0];

  return (
    <div className="-mt-8 grid gap-14 sm:gap-20 lg:gap-24">
      <JsonLd data={websiteSearchData(siteOrigin())} />

      {/* ───────── Hero: full-bleed lagoon, one message, two actions ───────── */}
      <section className="surface-inverse full-bleed relative isolate overflow-hidden bg-[#0a2342] text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[url('/images/hero-maldives.jpg')] bg-cover bg-[center_60%] scale-105 animate-[hero-drift_24s_ease-in-out_infinite_alternate]"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0a2342]/70 via-[#0a2342]/45 to-[#0a2342]" />
        <FlyingTern />

        <div className="relative mx-auto flex min-h-[calc(100svh-4.5rem)] w-full max-w-[90rem] 2xl:max-w-[105rem] flex-col justify-end gap-10 px-5 pb-10 pt-24 sm:justify-center sm:px-8 sm:pb-16 2xl:px-12">
          <div className="max-w-3xl space-y-6">
            <h1 className="text-[clamp(2.75rem,1.4rem+6vw,6rem)] font-display font-medium leading-[0.98] text-white">
              Every journey
              <br />
              has a <em className="font-display italic text-[#E2B65C]">star</em>.
            </h1>
            <p className="max-w-[44ch] text-base text-white/80 sm:text-lg">
              Hand-picked resorts, seaplane transfers arranged for you, and one written quote
              from a Maldivian specialist.
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button asChild variant="conversion" size="lg">
                <Link href="/plan">
                  Plan my trip
                  <ArrowRight aria-hidden="true" size={18} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="glass" size="lg">
                <Link href="/map">
                  <Plane aria-hidden="true" size={17} />
                  Fly the Star Chart
                </Link>
              </Button>
            </div>
          </div>

        </div>
      </section>

      {/* ───────── Featured resorts ───────── */}
      {resorts.length > 0 ? (
        <section aria-labelledby="featured-resorts-heading" className="grid gap-6">
          <SectionHead
            title="Islands we love"
            id="featured-resorts-heading"
            href="/resorts"
            linkLabel={`All ${resorts.length} resorts`}
          />
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {resorts.slice(0, 6).map((resort) => {
              const location = [
                resort.island.status === "PUBLISHED" ? resort.island.name : null,
                resort.island.status === "PUBLISHED" && resort.island.atoll.status === "PUBLISHED"
                  ? resort.island.atoll.name
                  : null,
              ]
                .filter(Boolean)
                .join(", ");
              return (
                <div key={resort.id} className="w-[80vw] max-w-sm shrink-0 snap-start sm:w-auto sm:max-w-none">
                  <ResortCard
                    resort={{
                      slug: resort.slug,
                      name: resort.name,
                      summary: resort.summary,
                      location: location || null,
                      image: leadImages.get(resort.id) ?? null,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ───────── Star Chart promo (the surprise) ───────── */}
      <section className="surface-inverse full-bleed relative isolate overflow-hidden bg-[#0a2342] text-white">
        <div className="mx-auto grid w-full max-w-[90rem] 2xl:max-w-[105rem] gap-10 px-5 py-14 sm:px-8 sm:py-20 2xl:px-12">
          <div className="space-y-5">
            <h2 className="text-[clamp(2rem,1.2rem+3vw,3.5rem)] font-display leading-[1.05] text-white">
              Watch your seaplane
              <br className="hidden sm:block" /> find your island.
            </h2>
            <p className="max-w-[46ch] text-white/75">
              Pick a resort and follow the real transfer from Velana airport, over the atolls, all the
              way to touchdown on the lagoon.
            </p>
            <Button asChild variant="gold" size="lg">
              <Link href="/map">
                Open the Star Chart
                <ArrowRight aria-hidden="true" size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ───────── Experiences ───────── */}
      {experiences.length > 0 ? (
        <section aria-labelledby="experiences-heading" className="grid gap-6">
          <SectionHead
            title="Moments worth the flight"
            id="experiences-heading"
            href="/experiences"
            linkLabel="All experiences"
          />
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {experiences.map((exp) => (
              <div key={exp.id} className="w-[80vw] max-w-sm shrink-0 snap-start sm:w-auto sm:max-w-none">
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
        </section>
      ) : null}

      {/* ───────── One featured voice ───────── */}
      {featured ? (
        <section aria-labelledby="reviews-heading" className="mx-auto max-w-4xl text-center">
          <h2 id="reviews-heading" className="sr-only">Traveller stories</h2>
          <blockquote className="mt-6 font-display text-[clamp(1.5rem,1rem+2vw,2.5rem)] italic leading-snug text-ocean">
            &ldquo;{featured.body}&rdquo;
          </blockquote>
          <p className="mt-6 text-sm text-muted">
            <span className="font-medium text-ink">{featured.displayName}</span>
            {featured.resortName ? <> · {featured.resortName}</> : null}
          </p>
          <Link href="/reviews" className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-lagoon-ink hover:underline dark:text-[#9adbd5]">
            More traveller stories <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      ) : null}

      {/* ───────── Guides ───────── */}
      {guides.length > 0 ? (
        <section aria-labelledby="guides-heading" className="grid gap-6">
          <SectionHead title="Read before you fly" id="guides-heading" href="/guides" linkLabel="All guides" />
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
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

      {/* ───────── Closing CTA ───────── */}
      <section className="surface-inverse relative isolate overflow-hidden rounded-[2rem] bg-[#0a2342] px-6 py-14 text-center text-white sm:px-12 sm:py-20">
        <h2 className="mx-auto mt-3 max-w-2xl text-[clamp(2rem,1.2rem+3vw,3.5rem)] font-display leading-tight text-white">
          Let&rsquo;s find your kind of island.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-white/75">
          Tell us your dates and style. A specialist replies with a clear written quote.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="conversion" size="lg">
            <Link href="/plan">
              Plan my trip <ArrowRight aria-hidden="true" size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild variant="glass" size="lg">
            <Link href="/contact">Talk to a specialist</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function SectionHead({
  title,
  id,
  href,
  linkLabel,
}: {
  title: string;
  id?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-[clamp(1.75rem,1.2rem+1.8vw,2.75rem)] font-display leading-tight text-ocean">
          {title}
        </h2>
      </div>
      {href && linkLabel ? (
        <Link
          href={href}
          className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-medium text-lagoon-ink hover:text-ocean dark:text-[#9adbd5]"
        >
          <span className="hidden sm:inline">{linkLabel}</span>
          <span className="sm:hidden">See all</span>
          <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}
