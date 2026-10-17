import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { RelatedList } from "@/components/discovery/related-list";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { listPublishedAtolls } from "@/modules/discovery";

export const metadata: Metadata = publicMetadata({
  title: "Destinations",
  description: "Published atolls.",
  path: "/destinations",
});

export default async function DestinationsPage() {
  try {
    const atolls = await listPublishedAtolls();
    return (
      <section className="grid gap-6">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Destinations" }]} />
        <h1>Destinations</h1>
        {atolls.length === 0 ? (
          <EmptyState title="Atolls">
            <p>No atoll is published.</p>
          </EmptyState>
        ) : (
          <RelatedList title="Atolls" items={atolls} />
        )}
      </section>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "Destinations could not be loaded.");
    return (
      <section className="grid gap-6">
        <h1>Destinations</h1>
        <ErrorState title="Destinations">
          <p>Destinations could not be loaded.</p>
        </ErrorState>
      </section>
    );
  }
}
