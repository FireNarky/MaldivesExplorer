import Link from "next/link";
import type { PublicReview } from "@/modules/reviews/service";

export function ReviewList({ reviews }: { reviews: PublicReview[] }) {
  return (
    <ul className="grid gap-6">
      {reviews.map((review) => (
        <li key={review.id} className="grid gap-2">
          <p className="text-sm text-muted">{review.label}</p>
          <p className="text-lg font-semibold text-ink dark:text-white">{review.displayName}</p>
          {review.rating ? <p>{review.rating} out of 5</p> : null}
          {review.ratingBasis ? <p>Basis: {review.ratingBasis}</p> : null}
          <p>{review.body}</p>
          {review.resortHref && review.resortName ? (
            <p>
              <Link
                href={review.resortHref}
                className="inline-flex min-h-11 items-center text-lagoon-ink dark:text-cyan-400 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {review.resortName}
              </Link>
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
