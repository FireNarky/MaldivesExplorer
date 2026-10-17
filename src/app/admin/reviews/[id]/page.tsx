import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { ReviewFields } from "@/components/reviews/review-fields";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import {
  featureReviewForm,
  hideReviewForm,
  publishReviewForm,
  rejectReviewForm,
  updateReviewForm,
} from "@/modules/reviews/actions";
import { ReviewError, listReviewResorts, readReview } from "@/modules/reviews/service";

export default async function ReviewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) notFound();
  const { id } = await params;
  const query = await searchParams;
  let review;
  let resorts;
  try {
    [review, resorts] = await Promise.all([readReview(session.user.id, id), listReviewResorts()]);
  } catch (error) {
    if (error instanceof ReviewError && error.status === 404) notFound();
    throw error;
  }
  return (
    <section className="grid max-w-[65ch] gap-8">
      <p>
        <Link href="/admin/reviews" className="font-semibold text-lagoon-ink">
          Reviews
        </Link>
      </p>
      <h1>{review.displayName}</h1>
      {query.error ? <FieldError>{query.error}</FieldError> : null}
      {query.notice ? <p role="status">Saved.</p> : null}
      <p>
        {review.moderationLabel}. {review.evidence}.
      </p>
      <form action={updateReviewForm} className="grid gap-4">
        <input type="hidden" name="id" value={review.id} />
        <ReviewFields resorts={resorts} values={review} />
        <Button type="submit">Save changes</Button>
      </form>
      <form action={hideReviewForm}>
        <input type="hidden" name="id" value={review.id} />
        <Button type="submit" variant="secondary">
          Hide
        </Button>
      </form>
      <form action={rejectReviewForm}>
        <input type="hidden" name="id" value={review.id} />
        <Button type="submit" variant="secondary">
          Reject
        </Button>
      </form>
      {review.canPublish ? (
        <>
          <form action={publishReviewForm}>
            <input type="hidden" name="id" value={review.id} />
            <Button type="submit">Publish</Button>
          </form>
          <form action={featureReviewForm}>
            <input type="hidden" name="id" value={review.id} />
            <input type="hidden" name="featured" value={review.featured ? "no" : "yes"} />
            <Button type="submit" variant="secondary">
              {review.featured ? "Remove from testimonials" : "Feature as a testimonial"}
            </Button>
          </form>
        </>
      ) : null}
      <section className="grid gap-2">
        <h2>History</h2>
        {review.history.length === 0 ? <p>No history yet.</p> : null}
        <ul className="grid gap-2">
          {review.history.map((item) => (
            <li key={`${item.label}-${item.at}`}>
              {item.label} · {item.at}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
