import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { DetailHero } from "@/components/discovery/detail-hero";
import { FaqList } from "@/components/discovery/faq-list";
import { JsonLd } from "@/components/discovery/json-ld";
import { Prose } from "@/components/discovery/prose";
import { RelatedList } from "@/components/discovery/related-list";
import { ListingActions } from "@/components/shortlist/listing-actions";
import { ErrorState } from "@/components/ui/error-state";
import { isNotFoundError } from "@/lib/http/navigation";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { attractionData } from "@/lib/seo/structured";
import { notePublicView } from "@/modules/analytics/service";
import { listLeadMedia, type LeadMedia } from "@/modules/media";
import {
  getPublishedExperience,
  listOwnerFaqs,
  listPublishedPlacesForExperience,
  listRelatedGuides,
} from "@/modules/discovery";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const experience = await getPublishedExperience(slug);
    if (!experience) {
      return publicMetadata({
        title: "Experience",
        description: "Experience",
        path: `/experiences/${slug}`,
      });
    }
    return publicMetadata({
      title: experience.seoTitle ?? experience.name,
      description: experience.seoDescription ?? experience.summary,
      path: `/experiences/${experience.slug}`,
    });
  } catch (error) {
    logError(error instanceof Error ? error.message : "Experience metadata could not be loaded.");
    return publicMetadata({
      title: "Experience",
      description: "Experience",
      path: `/experiences/${slug}`,
    });
  }
}

export default async function ExperiencePage({ params }: PageProps) {
  const { slug } = await params;
  try {
    const experience = await getPublishedExperience(slug);
    if (!experience) notFound();
    await notePublicView("experience", `/experiences/${experience.slug}`);
    const [places, guides, faqs, media] = await Promise.all([
      listPublishedPlacesForExperience(experience.id),
      listRelatedGuides("EXPERIENCE", experience.id),
      listOwnerFaqs("EXPERIENCE", experience.id),
      listLeadMedia("EXPERIENCE", [experience.id]).catch(() => new Map<string, LeadMedia>()),
    ]);
    const seasonVisible = Boolean(
      experience.seasonality && experience.seasonSourceNote && experience.seasonReviewedAt,
    );
    return (
      <article className="grid max-w-[65ch] gap-6">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Experiences", href: "/experiences" },
            { name: experience.name },
          ]}
        />
        <JsonLd
          data={attractionData({
            name: experience.name,
            description: experience.summary,
            path: `/experiences/${experience.slug}`,
          })}
        />
        <h1>{experience.name}</h1>
        <ListingActions entityType="EXPERIENCE" entityId={experience.id} save />
        <DetailHero media={media.get(experience.id)} />
        <p>{experience.summary}</p>
        {experience.category.status === "PUBLISHED" ? <p>{experience.category.name}</p> : null}
        <Prose text={experience.description} />
        {seasonVisible && experience.seasonality ? <Prose text={experience.seasonality} /> : null}
        {experience.suitability ? <p>Suitability: {experience.suitability}</p> : null}
        {experience.durationGuidance ? <p>Duration: {experience.durationGuidance}</p> : null}
        {experience.difficulty ? <p>Difficulty: {experience.difficulty}</p> : null}
        {experience.safetyNotes ? <Prose text={experience.safetyNotes} /> : null}
        {experience.environmentalNotes ? <Prose text={experience.environmentalNotes} /> : null}
        <RelatedList title="Resorts" items={places.resorts} />
        <RelatedList title="Islands" items={places.islands} />
        <RelatedList title="Guides" items={guides} />
        <FaqList items={faqs} />
      </article>
    );
  } catch (error) {
    if (isNotFoundError(error)) throw error;
    logError(error instanceof Error ? error.message : "The experience could not be loaded.");
    return (
      <ErrorState title="Experience">
        <p>The experience could not be loaded.</p>
      </ErrorState>
    );
  }
}
