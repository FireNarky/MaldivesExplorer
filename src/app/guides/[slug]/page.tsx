import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { FaqList } from "@/components/discovery/faq-list";
import { JsonLd } from "@/components/discovery/json-ld";
import { Prose } from "@/components/discovery/prose";
import { RelatedList } from "@/components/discovery/related-list";
import { ListingActions } from "@/components/shortlist/listing-actions";
import { ErrorState } from "@/components/ui/error-state";
import { isNotFoundError } from "@/lib/http/navigation";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { articleData } from "@/lib/seo/structured";
import { notePublicView } from "@/modules/analytics/service";
import { getPublishedGuide, listArticleRelations, listOwnerFaqs } from "@/modules/discovery";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const guide = await getPublishedGuide(slug);
    if (!guide)
      return publicMetadata({ title: "Guide", description: "Guide", path: `/guides/${slug}` });
    const image =
      guide.ogMedia && guide.ogMedia.status === "PUBLISHED"
        ? `/media/${guide.ogMedia.id}`
        : undefined;
    return publicMetadata({
      title: guide.seoTitle ?? guide.title,
      description: guide.seoDescription ?? guide.excerpt,
      path: guide.canonicalPath || `/guides/${guide.slug}`,
      type: "article",
      image,
    });
  } catch (error) {
    logError(error instanceof Error ? error.message : "Guide metadata could not be loaded.");
    return publicMetadata({ title: "Guide", description: "Guide", path: `/guides/${slug}` });
  }
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  try {
    const guide = await getPublishedGuide(slug);
    if (!guide) notFound();
    await notePublicView("guide", `/guides/${guide.slug}`);
    const [related, faqs] = await Promise.all([
      listArticleRelations(guide.id),
      listOwnerFaqs("ARTICLE", guide.id),
    ]);
    const authorName = guide.author.status === "PUBLISHED" ? guide.author.name : null;
    const topics = guide.tags.map((item) => item.tag.name);
    const stale = guide.staleAfter !== null && guide.staleAfter.getTime() < Date.now();
    return (
      <article className="grid max-w-[65ch] gap-6">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Guides", href: "/guides" },
            { name: guide.title },
          ]}
        />
        <JsonLd
          data={articleData({
            title: guide.title,
            description: guide.excerpt,
            path: guide.canonicalPath || `/guides/${guide.slug}`,
            publishedAt: guide.publishedAt?.toISOString() ?? null,
            authorName,
          })}
        />
        <h1>{guide.title}</h1>
        <ListingActions entityType="ARTICLE" entityId={guide.id} save />
        {authorName ? <p>By {authorName}</p> : null}
        <p>{guide.category.name}</p>
        <p>{guide.excerpt}</p>
        {stale ? <p>This guide is past its review date.</p> : null}
        <Prose text={guide.bodyPlain} />
        {topics.length > 0 ? <p>Topics: {topics.join(", ")}</p> : null}
        <RelatedList title="Related" items={related} />
        <FaqList items={faqs} />
      </article>
    );
  } catch (error) {
    if (isNotFoundError(error)) throw error;
    logError(error instanceof Error ? error.message : "The guide could not be loaded.");
    return (
      <ErrorState title="Guide">
        <p>The guide could not be loaded.</p>
      </ErrorState>
    );
  }
}
