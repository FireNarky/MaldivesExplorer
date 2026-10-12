import type { Metadata } from "next";
import Link from "next/link";
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
import { placeData, type Crumb } from "@/lib/seo/structured";
import { notePublicView } from "@/modules/analytics/service";
import {
  getPublishedIsland,
  listOwnerFaqs,
  listPublishedExperiencesForIsland,
  listPublishedResortsForIsland,
  listRelatedGuides,
} from "@/modules/discovery";

const islandTypeLabel = {
  RESORT: "Resort island",
  LOCAL: "Local island",
  UNINHABITED: "Uninhabited island",
} as const;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const island = await getPublishedIsland(slug);
    if (!island) {
      return publicMetadata({ title: "Island", description: "Island", path: `/islands/${slug}` });
    }
    return publicMetadata({
      title: island.seoTitle ?? island.name,
      description: island.seoDescription ?? island.summary,
      path: `/islands/${island.slug}`,
    });
  } catch (error) {
    logError(error instanceof Error ? error.message : "Island metadata could not be loaded.");
    return publicMetadata({ title: "Island", description: "Island", path: `/islands/${slug}` });
  }
}

export default async function IslandPage({ params }: PageProps) {
  const { slug } = await params;
  try {
    const island = await getPublishedIsland(slug);
    if (!island) notFound();
    await notePublicView("island", `/islands/${island.slug}`);
    const [resorts, experiences, guides, faqs] = await Promise.all([
      listPublishedResortsForIsland(island.id),
      listPublishedExperiencesForIsland(island.id),
      listRelatedGuides("ISLAND", island.id),
      listOwnerFaqs("ISLAND", island.id),
    ]);
    const atollPublished = island.atoll.status === "PUBLISHED";
    const crumbs: Crumb[] = [
      { name: "Home", href: "/" },
      { name: "Destinations", href: "/destinations" },
    ];
    if (atollPublished)
      crumbs.push({ name: island.atoll.name, href: `/atolls/${island.atoll.slug}` });
    crumbs.push({ name: island.name });
    return (
      <article className="grid max-w-[65ch] gap-6">
        <Breadcrumbs items={crumbs} />
        <JsonLd
          data={placeData({
            name: island.name,
            description: island.summary,
            path: `/islands/${island.slug}`,
            latitude: island.latitude,
            longitude: island.longitude,
          })}
        />
        <h1>{island.name}</h1>
        <ListingActions entityType="ISLAND" entityId={island.id} />
        <p>{island.summary}</p>
        <p>{islandTypeLabel[island.islandType]}</p>
        {atollPublished ? (
          <p>
            Atoll:{" "}
            <Link href={`/atolls/${island.atoll.slug}`} className="text-lagoon-ink">
              {island.atoll.name}
            </Link>
          </p>
        ) : null}
        <Prose text={island.description} />
        {island.history ? <Prose text={island.history} /> : null}
        {island.cultureNotes ? <Prose text={island.cultureNotes} /> : null}
        {island.etiquette ? <Prose text={island.etiquette} /> : null}
        <Coordinates latitude={island.latitude} longitude={island.longitude} />
        <RelatedList title="Resorts" items={resorts} />
        <RelatedList title="Experiences" items={experiences} />
        <RelatedList title="Guides" items={guides} />
        <FaqList items={faqs} />
      </article>
    );
  } catch (error) {
    if (isNotFoundError(error)) throw error;
    logError(error instanceof Error ? error.message : "The island could not be loaded.");
    return (
      <ErrorState title="Island">
        <p>The island could not be loaded.</p>
      </ErrorState>
    );
  }
}
