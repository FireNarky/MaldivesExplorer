import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { RelatedList } from "@/components/discovery/related-list";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { listPublishedCollections } from "@/modules/discovery";

export const metadata: Metadata = publicMetadata({
  title: "Collections",
  description: "Published collections.",
  path: "/collections",
});

export default async function CollectionsPage() {
  try {
    const collections = await listPublishedCollections();
    return (
      <section className="grid gap-6">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Collections" }]} />
        <h1>Collections</h1>
        {collections.length === 0 ? (
          <EmptyState title="Collections">
            <p>No collection is published.</p>
          </EmptyState>
        ) : (
          <RelatedList title="Published collections" items={collections} />
        )}
      </section>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "Collections could not be loaded.");
    return (
      <section className="grid gap-6">
        <h1>Collections</h1>
        <ErrorState title="Collections">
          <p>Collections could not be loaded.</p>
        </ErrorState>
      </section>
    );
  }
}
