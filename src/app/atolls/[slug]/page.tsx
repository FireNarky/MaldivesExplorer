import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { FaqList } from "@/components/discovery/faq-list";
import { JsonLd } from "@/components/discovery/json-ld";
import { Coordinates, Prose } from "@/components/discovery/prose";
import { RelatedList } from "@/components/discovery/related-list";
import { ListingActions } from "@/components/shortlist/listing-actions";
import { ErrorState } from "@/components/ui/error-state";
import { isNotFoundError } from "@/lib/http/navigation";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { placeData } from "@/lib/seo/structured";
import {
  getPublishedAtoll,
  listOwnerFaqs,
  listPublishedExperiencesForAtoll,
  listPublishedIslandsForAtoll,
  listPublishedResortsForAtoll,
  listRelatedGuides,
} from "@/modules/discovery";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const atoll = await getPublishedAtoll(slug);
    if (!atoll)
      return publicMetadata({ title: "Atoll", description: "Atoll", path: `/atolls/${slug}` });
    return publicMetadata({
      title: atoll.seoTitle ?? atoll.name,
      description: atoll.seoDescription ?? atoll.summary,
      path: `/atolls/${atoll.slug}`,
    });
  } catch (error) {
    logError(error instanceof Error ? error.message : "Atoll metadata could not be loaded.");
    return publicMetadata({ title: "Atoll", description: "Atoll", path: `/atolls/${slug}` });
  }
}

export default async function AtollPage({ params }: PageProps) {
  const { slug } = await params;
  try {
    const atoll = await getPublishedAtoll(slug);
    if (!atoll) notFound();
    const [islands, resorts, experiences, guides, faqs] = await Promise.all([
      listPublishedIslandsForAtoll(atoll.id),
      listPublishedResortsForAtoll(atoll.id),
      listPublishedExperiencesForAtoll(atoll.id),
      listRelatedGuides("ATOLL", atoll.id),
      listOwnerFaqs("ATOLL", atoll.id),
    ]);
    const path = `/atolls/${atoll.slug}`;
    return (
      <article className="grid max-w-[65ch] gap-6">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Destinations", href: "/destinations" },
            { name: atoll.name },
          ]}
        />
        <JsonLd
          data={placeData({
            name: atoll.name,
            description: atoll.summary,
            path,
            latitude: atoll.latitude,
            longitude: atoll.longitude,
          })}
        />
        <h1>{atoll.name}</h1>
        <ListingActions entityType="ATOLL" entityId={atoll.id} />
        <p>{atoll.summary}</p>
        <Prose text={atoll.description} />
        <Coordinates latitude={atoll.latitude} longitude={atoll.longitude} />
        <RelatedList title="Islands" items={islands} />
        <RelatedList title="Resorts" items={resorts} />
        <RelatedList title="Experiences" items={experiences} />
        <RelatedList title="Guides" items={guides} />
        <FaqList items={faqs} />
      </article>
    );
  } catch (error) {
    if (isNotFoundError(error)) throw error;
    logError(error instanceof Error ? error.message : "The atoll could not be loaded.");
    return (
      <ErrorState title="Atoll">
        <p>The atoll could not be loaded.</p>
      </ErrorState>
    );
  }
}
