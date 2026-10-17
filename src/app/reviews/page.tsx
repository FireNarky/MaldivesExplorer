import type { Metadata } from "next";
import { ReviewList } from "@/components/reviews/review-list";
import { EmptyState } from "@/components/ui/empty-state";
import { publicMetadata } from "@/lib/seo/metadata";
import { listTestimonials } from "@/modules/reviews/service";

export const metadata: Metadata = publicMetadata({
  title: "Testimonials",
  description: "Published notes and their sources.",
  path: "/reviews",
});

export default async function TestimonialsPage() {
  const reviews = await listTestimonials();
  return (
    <article className="grid max-w-[65ch] gap-6">
      <h1>Testimonials</h1>
      <p>Each published note shows the source stored on it.</p>
      {reviews.length === 0 ? (
        <EmptyState title="No testimonials are published">
          <p>A testimonial appears here after it is approved and featured.</p>
        </EmptyState>
      ) : (
        <ReviewList reviews={reviews} />
      )}
    </article>
  );
}
