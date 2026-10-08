import type { Review } from "@/types";
// Star counts from 5 down to 1, computed from the reviews the API returned.
export const ratingDistribution = (reviews: Pick<Review, "rating">[]) =>
  [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
// UX only: the API rejects edits/deletes of other users' reviews.
export const isOwnReview = (
  review: Pick<Review, "userId">,
  userId: string | undefined,
) => userId !== undefined && String(review.userId) === userId;
