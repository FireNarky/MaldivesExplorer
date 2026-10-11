import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { JsonLd } from "@/components/discovery/json-ld";
import { Prose } from "@/components/discovery/prose";
import { RelatedList } from "@/components/discovery/related-list";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { isNotFoundError } from "@/lib/http/navigation";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { collectionData } from "@/lib/seo/structured";
import {
  collectionBodyText,
  getPublishedCollection,
  listPublishedCollectionItems,
} from "@/modules/discovery";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const collection = await getPublishedCollection(slug);
    if (!collection) {
      return publicMetadata({
        title: "Collection",
        description: "Collection",
        path: `/collections/${slug}`,
      });
    }
    return publicMetadata({
      title: collection.seoTitle ?? collection.title,
      description: collection.seoDescription ?? collection.summary,
      path: `/collections/${collection.slug}`,
    });
  } catch (error) {
    logError(error instanceof Error ? error.message : "Collection metadata could not be loaded.");
    return publicMetadata({
      title: "Collection",
      description: "Collection",
      path: `/collections/${slug}`,
    });
  }
}

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params;
  try {
    const collection = await getPublishedCollection(slug);
    if (!collection) notFound();
    const items = await listPublishedCollectionItems(collection.id);
    const path = `/collections/${collection.slug}`;
    return (
      <article className="grid max-w-[65ch] gap-6">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Collections", href: "/collections" },
            { name: collection.title },
          ]}
        />
        <JsonLd
          data={collectionData({
            name: collection.title,
            description: collection.summary,
            path,
            items,
          })}
        />
        <h1>{collection.title}</h1>
        <p>{collection.summary}</p>
        <Prose text={collectionBodyText(collection.body)} />
        {items.length === 0 ? (
          <EmptyState title="Items">
            <p>No published item is in this collection.</p>
          </EmptyState>
        ) : (
          <RelatedList title="Items" items={items} />
        )}
      </article>
    );
  } catch (error) {
    if (isNotFoundError(error)) throw error;
    logError(error instanceof Error ? error.message : "The collection could not be loaded.");
    return (
      <ErrorState title="Collection">
        <p>The collection could not be loaded.</p>
      </ErrorState>
    );
  }
}
