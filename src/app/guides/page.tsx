import type { Metadata } from "next";
import { PageHeader } from "@/components/patterns/page-header";
import { GuideCard } from "@/components/patterns/guide-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { db } from "@/lib/db";

export const metadata: Metadata = publicMetadata({
  title: "Maldives Travel Guides & Insights",
  description: "Curated editorial guides on seaplane transfers, monsoon seasons, atoll geography, and villa selection.",
  path: "/guides",
});

export default async function GuidesPage() {
  try {
    const guides = await db.article.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      include: {
        category: true,
        author: true,
      },
    });

    const mediaLinks = await db.mediaLink.findMany({
      where: {
        ownerType: "ARTICLE",
        ownerId: { in: guides.map((g) => g.id) },
      },
      include: { media: { select: { id: true, altText: true } } },
    });
    const imageMap = new Map(mediaLinks.map((l) => [l.ownerId, l.media]));

    return (
      <div className="grid gap-10">
        <PageHeader
          crumbs={[{ name: "Home", href: "/" }, { name: "Guides" }]}
          title="Editorial Guides & Insights"
          lede="In-depth knowledge curated by local marine biologists, expedition leaders, and luxury travel curators to help you make informed decisions."
        />

        {guides.length === 0 ? (
          <EmptyState title="Guides">
            <p>No guides are published yet.</p>
          </EmptyState>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {guides.map((guide) => (
              <GuideCard
                key={guide.id}
                item={{
                  id: guide.id,
                  title: guide.title,
                  slug: guide.slug,
                  excerpt: guide.excerpt,
                  categoryName: guide.category?.name,
                  authorName: guide.author?.name,
                  image: imageMap.get(guide.id)
                    ? { id: imageMap.get(guide.id)!.id, altText: imageMap.get(guide.id)!.altText ?? guide.title }
                    : null,
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "Guides could not be loaded.");
    return (
      <ErrorState title="Guides">
        <p>Guides could not be loaded.</p>
      </ErrorState>
    );
  }
}
