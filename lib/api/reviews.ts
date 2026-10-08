import { request, json } from "./client";
import type { Review, ReviewRequest, ReviewSummary } from "@/types";
export const reviewsApi = {
  list: (productId: number) =>
    request<Review[]>(`/api/reviews/product/${productId}`),
  summary: (productId: number) =>
    request<ReviewSummary>(`/api/reviews/product/${productId}/summary`),
  create: (productId: number, payload: ReviewRequest) =>
    request<Review>(`/api/reviews/product/${productId}`, {
      method: "POST",
      body: json(payload),
    }),
  update: (reviewId: number, payload: ReviewRequest) =>
    request<Review>(`/api/reviews/${reviewId}`, {
      method: "PUT",
      body: json(payload),
    }),
  remove: (reviewId: number) =>
    request<unknown>(`/api/reviews/${reviewId}`, { method: "DELETE" }),
};
export const getProductReviews = reviewsApi.list;
export const getReviewSummary = reviewsApi.summary;
export const createReview = reviewsApi.create;
export const updateReview = reviewsApi.update;
export const deleteReview = reviewsApi.remove;
