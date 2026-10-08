"use client";
import Link from "next/link";
import { useId, useState } from "react";
import { usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareText, Pencil, Star, Trash2 } from "lucide-react";
import type { Review } from "@/types";
import { reviewsApi } from "@/lib/api/reviews";
import { ApiError } from "@/lib/api/client";
import { date, errorMessage } from "@/lib/format";
import { REVIEW_COMMENT_MAX, validateReview } from "@/lib/validation";
import { isOwnReview, ratingDistribution } from "@/lib/reviews";
import { useAuth, useToast } from "./providers";
import { Button, ErrorState, Modal } from "./ui";
const starSizes = { sm: 14, md: 18, lg: 30 } as const;
const ratingFormat = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 2,
});
export const formatRating = (value: number) => ratingFormat.format(value);
interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}
function StarIcon({ fill, size }: { fill: number; size: number }) {
  // Two stacked stars: an outline, and a filled copy clipped to `fill`.
  return (
    <span className="star" style={{ width: size, height: size }}>
      <Star size={size} className="star-empty" />
      <span className="star-fill" style={{ width: `${fill * 100}%` }}>
        <Star size={size} fill="currentColor" />
      </span>
    </span>
  );
}
export function StarRating({
  value,
  onChange,
  readOnly = !onChange,
  size = "md",
}: StarRatingProps) {
  const name = useId();
  const [hover, setHover] = useState(0);
  const px = starSizes[size];
  if (readOnly || !onChange) {
    const clamped = Math.min(5, Math.max(0, value));
    return (
      <span
        className={`star-rating star-rating-${size}`}
        role="img"
        aria-label={`5 üzerinden ${formatRating(clamped)} puan`}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <StarIcon
            key={i}
            fill={Math.min(1, Math.max(0, clamped - i))}
            size={px}
          />
        ))}
      </span>
    );
  }
  // Native radios give arrow-key selection and form semantics for free.
  const shown = hover || value;
  return (
    <div
      className={`star-rating star-input star-rating-${size}`}
      role="radiogroup"
      aria-label="Puan"
      onPointerLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <label
          key={n}
          className={n <= shown ? "on" : ""}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") setHover(n);
          }}
        >
          <input
            type="radio"
            className="sr-only"
            name={name}
            value={n}
            checked={value === n}
            onChange={() => onChange(n)}
          />
          <StarIcon fill={n <= shown ? 1 : 0} size={px} />
          <span className="sr-only">{n} yıldız</span>
        </label>
      ))}
    </div>
  );
}
export function RatingInline({
  averageRating,
  reviewCount,
  size = "sm",
}: {
  averageRating: number;
  reviewCount: number;
  size?: "sm" | "md";
}) {
  if (!reviewCount)
    return (
      <span className={`rating-inline rating-${size} muted`}>
        Henüz değerlendirilmemiş
      </span>
    );
  return (
    <span className={`rating-inline rating-${size}`}>
      <StarRating value={averageRating} size={size} readOnly />
      <strong aria-hidden="true">{formatRating(averageRating)}</strong>
      <span className="muted">({reviewCount} değerlendirme)</span>
    </span>
  );
}
export function ReviewCard({
  review,
  own,
  onEdit,
  onDelete,
}: {
  review: Review;
  own: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <article className={`review-card ${own ? "own" : ""}`}>
      <header>
        <div className="review-avatar" aria-hidden="true">
          {review.userName.trim().charAt(0).toLocaleUpperCase("tr-TR") || "?"}
        </div>
        <div className="review-author">
          <h3>{review.userName}</h3>
          <p className="muted">
            <time dateTime={review.createdAt}>{date(review.createdAt)}</time>
            {review.updatedAt && <span className="badge">Düzenlendi</span>}
            {own && <span className="badge">Senin değerlendirmen</span>}
          </p>
        </div>
        <StarRating value={review.rating} size="sm" readOnly />
      </header>
      {review.comment && <p className="review-comment">{review.comment}</p>}
      {own && (onEdit || onDelete) && (
        <div className="review-actions">
          {onEdit && (
            <Button className="btn-secondary" onClick={onEdit}>
              <Pencil size={14} />
              Düzenle
            </Button>
          )}
          {onDelete && (
            <Button className="btn-secondary danger" onClick={onDelete}>
              <Trash2 size={14} />
              Sil
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
function useRefreshRatings(productId: number) {
  const client = useQueryClient();
  // The API recomputes the average; refetch instead of guessing it locally.
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["reviews", productId] }),
      client.invalidateQueries({ queryKey: ["product", productId] }),
      client.invalidateQueries({ queryKey: ["products"] }),
    ]);
}
export function ReviewForm({
  productId,
  review,
  onDone,
  onCancel,
  showTitle = true,
}: {
  productId: number;
  review?: Review;
  onDone: () => void;
  onCancel?: () => void;
  showTitle?: boolean;
}) {
  const toast = useToast();
  const refresh = useRefreshRatings(productId);
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [comment, setComment] = useState(review?.comment ?? "");
  const save = useMutation({
    mutationFn: async () => {
      const payload = validateReview(rating, comment);
      return review
        ? reviewsApi.update(review.id, payload)
        : reviewsApi.create(productId, payload);
    },
    onSuccess: async (result) => {
      await refresh();
      toast(
        result.message ||
          (review ? "Değerlendirme güncellendi." : "Değerlendirme eklendi."),
      );
      onDone();
    },
    onError: (error) => {
      // Our copy is stale (already reviewed elsewhere, or review removed).
      if (
        error instanceof ApiError &&
        (error.code === "reviewAlreadyExists" ||
          error.code === "reviewNotFound")
      )
        void refresh();
    },
  });
  return (
    <form
      className="review-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!save.isPending) save.mutate();
      }}
    >
      {showTitle && (
        <h3>{review ? "Değerlendirmeni düzenle" : "Değerlendirme yaz"}</h3>
      )}
      <fieldset disabled={save.isPending}>
        <legend>
          Puanın <span className="muted">(zorunlu)</span>
        </legend>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </fieldset>
      <label>
        <span>
          Yorumun <span className="muted">(isteğe bağlı)</span>
        </span>
        <textarea
          rows={4}
          maxLength={REVIEW_COMMENT_MAX}
          value={comment}
          disabled={save.isPending}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Ürünle ilgili deneyimini paylaş…"
          aria-describedby={`review-count-${productId}`}
        />
        <small
          id={`review-count-${productId}`}
          className={`char-count ${comment.length >= REVIEW_COMMENT_MAX ? "limit" : ""}`}
        >
          {comment.length} / {REVIEW_COMMENT_MAX}
        </small>
      </label>
      {save.error && (
        <p className="field-error" role="alert">
          {errorMessage(save.error)}
        </p>
      )}
      <div className="form-actions">
        {onCancel && (
          <Button
            type="button"
            className="btn-secondary"
            disabled={save.isPending}
            onClick={onCancel}
          >
            Vazgeç
          </Button>
        )}
        <Button type="submit" pending={save.isPending}>
          {review ? "Güncelle" : "Gönder"}
        </Button>
      </div>
    </form>
  );
}
// Loads the viewer's existing review lazily, so order lists stay one request.
function ReviewDialog({
  productId,
  productName,
  close,
}: {
  productId: number;
  productName: string;
  close: () => void;
}) {
  const { currentUser } = useAuth();
  const reviews = useQuery({
    queryKey: ["reviews", productId],
    queryFn: () => reviewsApi.list(productId),
  });
  const mine = reviews.data?.data?.find((r) => isOwnReview(r, currentUser?.id));
  return (
    <Modal title="Ürünü değerlendir" close={close}>
      <p className="review-dialog-product">
        <Link href={`/products/${productId}#reviews`}>{productName}</Link>
      </p>
      {reviews.isPending ? (
        <div className="skeleton skeleton-line" role="status" />
      ) : reviews.isError ? (
        <ErrorState
          error={reviews.error}
          retry={() => void reviews.refetch()}
        />
      ) : (
        <>
          {mine && (
            <p className="muted review-dialog-note">
              Bu ürünü daha önce değerlendirdin. Değerlendirmeni
              güncelleyebilirsin.
            </p>
          )}
          <ReviewForm
            key={mine?.id ?? "new"}
            productId={productId}
            review={mine}
            onDone={close}
            onCancel={close}
            showTitle={false}
          />
        </>
      )}
    </Modal>
  );
}
export function ReviewProductButton({
  productId,
  productName,
}: {
  productId: number;
  productName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        className="btn-secondary review-product-btn"
        onClick={() => setOpen(true)}
        aria-label={`${productName} ürününü değerlendir`}
      >
        <Star size={14} />
        Değerlendir
      </Button>
      {open && (
        <ReviewDialog
          productId={productId}
          productName={productName}
          close={() => setOpen(false)}
        />
      )}
    </>
  );
}
function ReviewsSkeleton() {
  return (
    <div className="reviews-list" role="status" aria-label="Yükleniyor">
      {[0, 1].map((i) => (
        <div className="review-card" key={i}>
          <div className="skeleton skeleton-line short" />
          <div className="skeleton skeleton-line" />
        </div>
      ))}
    </div>
  );
}
export function ProductReviews({ productId }: { productId: number }) {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const toast = useToast();
  const refresh = useRefreshRatings(productId);
  const reviews = useQuery({
    queryKey: ["reviews", productId],
    queryFn: () => reviewsApi.list(productId),
  });
  const summary = useQuery({
    queryKey: ["reviews", productId, "summary"],
    queryFn: () => reviewsApi.summary(productId),
  });
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState<Review | null>(null);
  const remove = useMutation({
    mutationFn: (review: Review) => reviewsApi.remove(review.id),
    onSuccess: async (result) => {
      await refresh();
      setDeleting(null);
      setEditing(false);
      toast(result.message || "Değerlendirme silindi.");
    },
    onError: (error) => {
      setDeleting(null);
      toast(errorMessage(error), true);
      void refresh();
    },
  });
  const list = reviews.data?.data ?? [];
  const mine = list.find((r) => isOwnReview(r, currentUser?.id));
  const others = list.filter((r) => r !== mine);
  const stats = summary.data?.data;
  const distribution = ratingDistribution(list);
  return (
    <section className="reviews" id="reviews" aria-labelledby="reviews-title">
      <div className="section-heading compact">
        <h2 id="reviews-title">Müşteri Değerlendirmeleri</h2>
      </div>
      <div className="reviews-layout">
        <aside className="reviews-overview">
          {summary.isPending ? (
            <div className="skeleton skeleton-line" />
          ) : summary.isError ? (
            <ErrorState
              error={summary.error}
              retry={() => void summary.refetch()}
            />
          ) : stats?.reviewCount ? (
            <div className="reviews-score">
              <strong>{formatRating(stats.averageRating)}</strong>
              <div>
                <StarRating value={stats.averageRating} size="md" readOnly />
                <p className="muted">{stats.reviewCount} değerlendirme</p>
              </div>
            </div>
          ) : (
            <p className="muted">Henüz değerlendirilmemiş</p>
          )}
          {!!list.length && (
            <ul className="rating-bars" aria-label="Yıldız dağılımı">
              {distribution.map(({ star, count }) => (
                <li key={star}>
                  <span>{star} yıldız</span>
                  <span className="rating-bar" aria-hidden="true">
                    <span
                      style={{ width: `${(count / list.length) * 100}%` }}
                    />
                  </span>
                  <span className="muted">{count}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="review-compose">
            {isLoading ||
            (isAuthenticated && reviews.isPending) ? null : !isAuthenticated ? (
              <div className="review-login">
                <p>Değerlendirme yapmak için giriş yapın.</p>
                <Link
                  className="btn btn-secondary"
                  href={`/login?next=${encodeURIComponent(pathname)}`}
                >
                  Giriş yap
                </Link>
              </div>
            ) : mine && !editing ? (
              <Button
                className="btn-secondary"
                onClick={() => setEditing(true)}
              >
                <Pencil size={15} />
                Değerlendirmeni Düzenle
              </Button>
            ) : (
              <ReviewForm
                key={mine?.id ?? "new"}
                productId={productId}
                review={mine}
                onDone={() => setEditing(false)}
                onCancel={mine ? () => setEditing(false) : undefined}
              />
            )}
          </div>
        </aside>
        <div>
          {reviews.isPending ? (
            <ReviewsSkeleton />
          ) : reviews.isError ? (
            <ErrorState
              error={reviews.error}
              retry={() => void reviews.refetch()}
            />
          ) : !list.length ? (
            <div className="reviews-empty">
              <MessageSquareText size={28} strokeWidth={1.4} />
              <p>
                Bu ürün henüz değerlendirilmemiş. İlk değerlendirmeyi sen yap!
              </p>
            </div>
          ) : (
            <div className="reviews-list">
              {mine && (
                <ReviewCard
                  review={mine}
                  own
                  onEdit={() => setEditing(true)}
                  onDelete={() => setDeleting(mine)}
                />
              )}
              {others.map((review) => (
                <ReviewCard key={review.id} review={review} own={false} />
              ))}
            </div>
          )}
        </div>
      </div>
      {deleting && (
        <Modal
          title="Değerlendirme silinsin mi?"
          close={() => {
            if (!remove.isPending) setDeleting(null);
          }}
        >
          <p>
            Bu değerlendirmeyi silmek istediğinize emin misiniz? Bu işlem geri
            alınamaz.
          </p>
          <div className="form-actions">
            <Button
              className="btn-secondary"
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
            >
              Vazgeç
            </Button>
            <Button
              className="btn-danger"
              pending={remove.isPending}
              onClick={() => {
                if (!remove.isPending) remove.mutate(deleting);
              }}
            >
              Değerlendirmeyi sil
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
