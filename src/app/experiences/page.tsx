import type { Metadata } from "next";
import { PageHeader } from "@/components/patterns/page-header";
import { ExperienceCard } from "@/components/patterns/experience-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { db } from "@/lib/db";

export const metadata: Metadata = publicMetadata({
  title: "Maldives Signature Experiences",
  description: "Manta ray snorkeling in Hanifaru Bay, whale shark encounters, sandbank castaway breakfasts, and undersea dining.",
  path: "/experiences",
});

export default async function ExperiencesPage() {
  try {
    const experiences = await db.experience.findMany({
      where: {
        status: "PUBLISHED",
        NOT: { slug: { startsWith: "browser-" } },
      },
      orderBy: { name: "asc" },
      include: {
        category: true,
      },
    });

    const mediaLinks = await db.mediaLink.findMany({
      where: {
        ownerType: "EXPERIENCE",
        ownerId: { in: experiences.map((e) => e.id) },
      },
      include: { media: { select: { id: true, altText: true } } },
    });
    const imageMap = new Map(mediaLinks.map((l) => [l.ownerId, l.media]));

    return (
      <div className="grid gap-10">
        <PageHeader
          crumbs={[{ name: "Home", href: "/" }, { name: "Experiences" }]}
          title="Signature Experiences"
          lede="From swimming alongside 100 gentle reef mantas to private cinema beneath equatorial stars, discover unforgettable adventures across the atolls."
        />

        {experiences.length === 0 ? (
          <EmptyState title="Experiences">
            <p>No experiences are published yet.</p>
          </EmptyState>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((exp) => (
              <ExperienceCard
                key={exp.id}
                item={{
                  id: exp.id,
                  name: exp.name,
                  slug: exp.slug,
                  summary: exp.summary,
                  durationGuidance: exp.durationGuidance,
                  seasonality: exp.seasonality,
                  categoryName: exp.category?.name,
                  image: imageMap.get(exp.id)
                    ? { id: imageMap.get(exp.id)!.id, altText: imageMap.get(exp.id)!.altText ?? exp.name }
                    : null,
                }}
              />
            ))}
          </div>
        )}
      </div>
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
