import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { RelatedList } from "@/components/discovery/related-list";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { listPublishedGuides } from "@/modules/discovery";

export const metadata: Metadata = publicMetadata({
  title: "Guides",
  description: "Published guides.",
  path: "/guides",
});

export default async function GuidesPage() {
  try {
    const guides = await listPublishedGuides();
    return (
      <section className="grid gap-6">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Guides" }]} />
        <h1>Guides</h1>
        {guides.length === 0 ? (
          <EmptyState title="Guides">
            <p>No guide is published.</p>
          </EmptyState>
        ) : (
          <RelatedList title="Published guides" items={guides} />
        )}
      </section>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "Guides could not be loaded.");
    return (
      <section className="grid gap-6">
        <h1>Guides</h1>
        <ErrorState title="Guides">
          <p>Guides could not be loaded.</p>
        </ErrorState>
      </section>
    );
  }
}
