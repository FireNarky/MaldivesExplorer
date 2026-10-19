import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { RelatedList } from "@/components/discovery/related-list";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { listPublishedExperiences } from "@/modules/discovery";

export const metadata: Metadata = publicMetadata({
  title: "Experiences",
  description: "Published experiences.",
  path: "/experiences",
});

export default async function ExperiencesPage() {
  try {
    const experiences = await listPublishedExperiences();
    return (
      <section className="grid gap-6">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Experiences" }]} />
        <h1>Experiences</h1>
        {experiences.length === 0 ? (
          <EmptyState title="Experiences">
            <p>No experience is published.</p>
          </EmptyState>
        ) : (
          <RelatedList title="Published experiences" items={experiences} />
        )}
      </section>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "Experiences could not be loaded.");
    return (
      <ErrorState title="Experiences">
        <p>Experiences could not be loaded.</p>
      </ErrorState>
    );
  }
}
