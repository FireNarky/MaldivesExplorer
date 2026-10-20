import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Compass, MapPin } from "lucide-react";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { FaqList } from "@/components/discovery/faq-list";
import { JsonLd } from "@/components/discovery/json-ld";
import { RelatedList } from "@/components/discovery/related-list";
import { PriceDisclosure } from "@/components/patterns/price-disclosure";
import { ReviewList } from "@/components/reviews/review-list";
import { ListingActions } from "@/components/shortlist/listing-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { isNotFoundError } from "@/lib/http/navigation";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { lodgingData, type Crumb } from "@/lib/seo/structured";
import { notePublicView } from "@/modules/analytics/service";
import { getPublishedResort, listPublishedResortImages } from "@/modules/catalog";
import { listPublishedForResort } from "@/modules/reviews/service";
import {
  listOwnerFaqs,
  listPublishedExperiencesForResort,
  listRelatedGuides,
} from "@/modules/discovery";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const resort = await getPublishedResort(slug);
    if (!resort) {
      return publicMetadata({ title: "Resort", description: "Resort", path: `/resorts/${slug}` });
    }
    return publicMetadata({
      title: resort.seoTitle ?? resort.name,
      description: resort.seoDescription ?? resort.summary,
      path: `/resorts/${resort.slug}`,
    });
  } catch (error) {
    logError(error instanceof Error ? error.message : "Resort metadata could not be loaded.");
    return publicMetadata({ title: "Resort", description: "Resort", path: `/resorts/${slug}` });
  }
}

export default async function ResortPage({ params }: PageProps) {
  const { slug } = await params;
  try {
    const resort = await getPublishedResort(slug);
    if (!resort) notFound();
    const [images, experiences, guides, faqs, reviews] = await Promise.all([
      listPublishedResortImages(resort.id),
      listPublishedExperiencesForResort(resort.id),
      listRelatedGuides("RESORT", resort.id),
      listOwnerFaqs("RESORT", resort.id),
      listPublishedForResort(resort.id),
    ]);
    await notePublicView("resort", `/resorts/${resort.slug}`);
    const crumbs: Crumb[] = [
      { name: "Home", href: "/" },
      { name: "Resorts", href: "/resorts" },
    ];
    if (resort.island.status === "PUBLISHED") {
      crumbs.push({ name: resort.island.name, href: `/islands/${resort.island.slug}` });
    }
    crumbs.push({ name: resort.name });
    const location = [
      resort.island.status === "PUBLISHED" ? resort.island.name : null,
      resort.island.status === "PUBLISHED" && resort.island.atoll.status === "PUBLISHED"
        ? resort.island.atoll.name
        : null,
    ]
      .filter(Boolean)
      .join(", ");
    const gallery = images.filter((image) => image.media.altText);
    const page = (
      <article className="grid gap-8">
        <Breadcrumbs items={crumbs} />
        <JsonLd
          data={lodgingData({
            name: resort.name,
            description: resort.summary,
            path: `/resorts/${resort.slug}`,
          })}
        />
        <header className="grid gap-3">
          {location ? (
            <p className="flex items-center gap-2 text-base text-muted">
              <MapPin aria-hidden="true" size={16} strokeWidth={1.75} />
              {location}
            </p>
          ) : null}
          <h1>{resort.name}</h1>
          <p className="max-w-[65ch] text-lg">{resort.summary}</p>
        </header>

        {gallery.length > 0 ? (
          <section
            aria-label="Photos"
            className="grid gap-2 sm:grid-cols-3 sm:grid-rows-2 [&>*:first-child]:sm:col-span-2 [&>*:first-child]:sm:row-span-2"
          >
            {gallery.slice(0, 5).map((image) => (
              <div
                key={image.media.id}
                className="relative aspect-[3/2] overflow-hidden rounded-lg bg-mist"
              >
                <Image
                  src={`/media/${image.media.id}`}
                  alt={image.media.altText ?? ""}
                  fill
                  unoptimized
                  sizes="(min-width: 64rem) 60vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
          </section>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="grid content-start gap-10 lg:col-span-8">
            <section className="grid max-w-[65ch] gap-4">
              <h2>Overview</h2>
              <p>{resort.description}</p>
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted">Property type</dt>
                  <dd className="font-semibold">{resort.propertyType}</dd>
                </div>
                {resort.island.status === "PUBLISHED" ? (
                  <div>
                    <dt className="text-sm text-muted">Island</dt>
                    <dd>
                      <Link
                        href={`/islands/${resort.island.slug}`}
                        className="font-semibold text-lagoon-ink underline"
                      >
                        {resort.island.name}
                      </Link>
                    </dd>
                  </div>
                ) : null}
                {resort.island.status === "PUBLISHED" &&
                resort.island.atoll.status === "PUBLISHED" ? (
                  <div>
                    <dt className="text-sm text-muted">Atoll</dt>
                    <dd>
                      <Link
                        href={`/atolls/${resort.island.atoll.slug}`}
                        className="font-semibold text-lagoon-ink underline"
                      >
                        {resort.island.atoll.name}
                      </Link>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>
            {resort.roomTypes.length > 0 ? (
              <section className="grid gap-4">
                <h2>Rooms</h2>
                <ul className="grid gap-4 md:grid-cols-2">
                  {resort.roomTypes.map((room) => (
                    <li
                      key={room.id}
                      className="grid content-start gap-2 rounded-2xl border border-border-subtle bg-white dark:bg-[#0d1e27] dark:border-[#1a3442] p-4 shadow-1 lg:p-6"
                    >
                      <h3 className="text-ocean dark:text-cyan-300">{room.name}</h3>
                      <p className="text-ink dark:text-slate-200">{room.description}</p>
                      <p className="text-sm text-muted">Maximum adults: {room.maxAdults}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {resort.diningVenues.length > 0 ? (
              <section className="grid gap-4">
                <h2>Dining</h2>
                <ul className="grid gap-4 md:grid-cols-2">
                  {resort.diningVenues.map((venue) => (
                    <li
                      key={venue.id}
                      className="grid content-start gap-2 rounded-2xl border border-border-subtle bg-white dark:bg-[#0d1e27] dark:border-[#1a3442] p-4 shadow-1 lg:p-6"
                    >
                      <h3 className="text-ocean dark:text-cyan-300">{venue.name}</h3>
                      <p className="text-ink dark:text-slate-200">{venue.description}</p>
                      {venue.cuisine ? <p className="text-sm text-muted">{venue.cuisine}</p> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {resort.transfers.length > 0 ? (
              <section className="grid gap-4">
                <h2>Transfers</h2>
                <ul className="grid gap-4 md:grid-cols-2">
                  {resort.transfers.map((transfer) => (
                    <li
                      key={transfer.id}
                      className="grid content-start gap-2 rounded-2xl border border-border-subtle bg-white dark:bg-[#0d1e27] dark:border-[#1a3442] p-4 shadow-1 lg:p-6"
                    >
                      <h3 className="text-ocean dark:text-cyan-300">{transfer.label}</h3>
                      <p className="text-ink dark:text-slate-200">{transfer.transferType.label}</p>
                      {transfer.durationMinutes ? (
                        <p className="text-sm text-muted">
                          Duration: {transfer.durationMinutes} minutes
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {resort.amenities.length > 0 ? (
              <section className="grid gap-4">
                <h2>Amenities</h2>
                <ul className="flex flex-wrap gap-2">
                  {resort.amenities.map((item) => (
                    <li key={item.amenityId}>
                      <Badge tone="quoted">{item.amenity.name}</Badge>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {resort.audiences.length > 0 ? (
              <section className="grid gap-4">
                <h2>Good for</h2>
                <ul className="flex flex-wrap gap-2">
                  {resort.audiences.map((item) => (
                    <li key={item.audienceTagId}>
                      <Badge tone="info">{item.audienceTag.name}</Badge>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {reviews.length > 0 ? (
              <section className="grid gap-4">
                <h2>Reviews</h2>
                <ReviewList reviews={reviews} />
              </section>
            ) : null}
            <RelatedList title="Experiences" items={experiences} />
            <RelatedList title="Guides" items={guides} />
            <FaqList items={faqs} />
          </div>

          <aside
            aria-label="Plan this stay"
            className="order-first lg:order-last lg:col-span-4 lg:sticky lg:top-24 lg:self-start"
          >
            <div className="grid gap-4 rounded-2xl border border-border-subtle bg-white dark:bg-[#0d1e27] dark:border-[#1a3442] p-6 shadow-2">
              <h2 className="text-2xl text-ocean dark:text-cyan-300">Plan a stay here</h2>
              <PriceDisclosure />
              <Button asChild variant="conversion">
                <Link href="/plan">
                  <Compass aria-hidden="true" size={20} strokeWidth={1.75} />
                  Plan my trip
                </Link>
              </Button>
              <div className="flex flex-wrap items-center gap-3">
                <ListingActions entityType="RESORT" entityId={resort.id} save compare />
              </div>
            </div>
          </aside>
        </div>
      </article>
    );
    return page;
  } catch (error) {
    if (isNotFoundError(error)) throw error;
    logError(error instanceof Error ? error.message : "The resort could not be loaded.");
    return (
      <ErrorState title="Resort">
        <p>The resort could not be loaded.</p>
      </ErrorState>
    );
  }
}
