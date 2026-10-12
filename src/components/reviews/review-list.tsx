import Link from "next/link";
import type { PublicReview } from "@/modules/reviews/service";

export function ReviewList({ reviews }: { reviews: PublicReview[] }) {
  return (
    <ul className="grid gap-6">
      {reviews.map((review) => (
        <li key={review.id} className="grid gap-2">
          <p className="text-sm text-muted">{review.label}</p>
          <h3>{review.displayName}</h3>
          {review.rating ? <p>{review.rating} out of 5</p> : null}
          {review.ratingBasis ? <p>Basis: {review.ratingBasis}</p> : null}
          <p>{review.body}</p>
          {review.resortHref && review.resortName ? (
            <p>
              <Link href={review.resortHref} className="text-lagoon-ink">
                {review.resortName}
              </Link>
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
