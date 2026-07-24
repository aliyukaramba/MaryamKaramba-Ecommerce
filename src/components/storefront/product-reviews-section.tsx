import { StarRatingDisplay } from "@/components/storefront/star-rating-display";
import { formatDate } from "@/lib/utils";
import { getProductReviews } from "@/actions/review";

export async function ProductReviewsSection({
  productId,
  averageRating,
  reviewCount,
}: {
  productId: string;
  averageRating: number | null;
  reviewCount: number;
}) {
  const reviews = await getProductReviews(productId);

  return (
    <section className="mt-10 border-t border-border pt-8">
      <div className="mb-6 flex items-center gap-3">
        <h2 className="font-display text-2xl">Reviews</h2>
        {reviewCount > 0 && averageRating != null && (
          <div className="flex items-center gap-2">
            <StarRatingDisplay rating={averageRating} />
            <span className="text-sm text-muted-foreground">
              {averageRating.toFixed(1)} ({reviewCount} review{reviewCount === 1 ? "" : "s"})
            </span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No reviews yet — be the first to share your experience after your order is delivered.
        </p>
      ) : (
        <div className="space-y-5">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-border pb-5 last:border-0">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium">{review.customerAccount.fullName}</span>
                <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
              </div>
              <StarRatingDisplay rating={review.rating} size="sm" />
              <p className="mt-2 text-sm text-foreground/90">{review.reviewText}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
