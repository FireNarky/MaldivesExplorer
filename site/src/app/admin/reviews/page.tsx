import Link from "next/link";
import { auth } from "@/auth";
import { ReviewFields } from "@/components/reviews/review-fields";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError } from "@/components/ui/field-error";
import { createReviewForm } from "@/modules/reviews/actions";
import { ReviewError, listReviewResorts, listReviews } from "@/modules/reviews/service";
import { notFound } from "next/navigation";

export default async function ReviewsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) notFound();
  const query = await searchParams;
  let reviews;
  let resorts;
  try {
    [reviews, resorts] = await Promise.all([listReviews(session.user.id), listReviewResorts()]);
  } catch (error) {
    if (error instanceof ReviewError && error.status === 404) notFound();
    throw error;
  }
  return (
    <section className="grid max-w-[65ch] gap-8">
      <h1>Reviews</h1>
      {query.error ? <FieldError>{query.error}</FieldError> : null}
      {reviews.length === 0 ? (
        <EmptyState title="No reviews yet">
          <p>Add a review after permission to publish it is recorded.</p>
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {reviews.map((review) => (
            <li key={review.id}>
              <Link href={`/admin/reviews/${review.id}`} className="font-semibold text-lagoon-ink">
                {review.displayName}
              </Link>
              <p>
                {review.sourceLabel} · {review.moderationLabel}
                {review.featured ? " · Featured" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      <form action={createReviewForm} className="grid gap-4">
        <h2>Add a review</h2>
        <ReviewFields resorts={resorts} />
        <Button type="submit">Save review</Button>
      </form>
    </section>
  );
}
