import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { FaqList } from "@/components/discovery/faq-list";
import { JsonLd } from "@/components/discovery/json-ld";
import { RelatedList } from "@/components/discovery/related-list";
import { ErrorState } from "@/components/ui/error-state";
import { isNotFoundError } from "@/lib/http/navigation";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { lodgingData, type Crumb } from "@/lib/seo/structured";
import { getPublishedResort, listPublishedResortImages } from "@/modules/catalog";
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
    const [images, experiences, guides, faqs] = await Promise.all([
      listPublishedResortImages(resort.id),
      listPublishedExperiencesForResort(resort.id),
      listRelatedGuides("RESORT", resort.id),
      listOwnerFaqs("RESORT", resort.id),
    ]);
    const crumbs: Crumb[] = [
      { name: "Home", href: "/" },
      { name: "Resorts", href: "/resorts" },
    ];
    if (resort.island.status === "PUBLISHED") {
      crumbs.push({ name: resort.island.name, href: `/islands/${resort.island.slug}` });
    }
    crumbs.push({ name: resort.name });
    const page = (
      <article className="grid max-w-[65ch] gap-6">
        <Breadcrumbs items={crumbs} />
        <JsonLd
          data={lodgingData({
            name: resort.name,
            description: resort.summary,
            path: `/resorts/${resort.slug}`,
          })}
        />
        <h1>{resort.name}</h1>
        <p>{resort.summary}</p>
        <p>{resort.description}</p>
        <p>Property type: {resort.propertyType}</p>
        {resort.island.status === "PUBLISHED" ? (
          <p>
            Island:{" "}
            <Link href={`/islands/${resort.island.slug}`} className="text-lagoon-ink">
              {resort.island.name}
            </Link>
            {resort.island.atoll.status === "PUBLISHED" ? (
              <>
                {". Atoll: "}
                <Link href={`/atolls/${resort.island.atoll.slug}`} className="text-lagoon-ink">
                  {resort.island.atoll.name}
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
        <p>An indicative price is not published.</p>
        {images.map((image) =>
          image.media.altText ? (
            <div key={image.media.id} className="relative aspect-[3/2] w-full">
              <Image
                src={`/media/${image.media.id}`}
                alt={image.media.altText}
                fill
                unoptimized
                sizes="(min-width: 65ch) 65ch, 100vw"
                className="object-cover"
              />
            </div>
          ) : null,
        )}
        {resort.roomTypes.length > 0 ? (
          <section className="grid gap-3">
            <h2>Rooms</h2>
            <ul className="grid gap-3">
              {resort.roomTypes.map((room) => (
                <li key={room.id}>
                  <h3>{room.name}</h3>
                  <p>{room.description}</p>
                  <p>Maximum adults: {room.maxAdults}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {resort.diningVenues.length > 0 ? (
          <section className="grid gap-3">
            <h2>Dining</h2>
            <ul className="grid gap-3">
              {resort.diningVenues.map((venue) => (
                <li key={venue.id}>
                  <h3>{venue.name}</h3>
                  <p>{venue.description}</p>
                  {venue.cuisine ? <p>{venue.cuisine}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {resort.transfers.length > 0 ? (
          <section className="grid gap-3">
            <h2>Transfers</h2>
            <ul className="grid gap-3">
              {resort.transfers.map((transfer) => (
                <li key={transfer.id}>
                  <h3>{transfer.label}</h3>
                  <p>{transfer.transferType.label}</p>
                  {transfer.durationMinutes ? (
                    <p>Duration: {transfer.durationMinutes} minutes</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {resort.amenities.length > 0 ? (
          <section className="grid gap-3">
            <h2>Amenities</h2>
            <ul>
              {resort.amenities.map((item) => (
                <li key={item.amenityId}>{item.amenity.name}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {resort.audiences.length > 0 ? (
          <section className="grid gap-3">
            <h2>Audiences</h2>
            <ul>
              {resort.audiences.map((item) => (
                <li key={item.audienceTagId}>{item.audienceTag.name}</li>
              ))}
            </ul>
          </section>
        ) : null}
        <RelatedList title="Experiences" items={experiences} />
        <RelatedList title="Guides" items={guides} />
        <FaqList items={faqs} />
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
