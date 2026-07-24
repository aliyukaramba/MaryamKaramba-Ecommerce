"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRatingInput } from "@/components/storefront/star-rating-input";
import { submitReview } from "@/actions/review";

export function ReviewForm({
  inquiryId,
  productId,
  productName,
  existingReview,
}: {
  inquiryId: string;
  productId: string;
  productName: string;
  existingReview: { rating: number; reviewText: string } | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [reviewText, setReviewText] = useState(existingReview?.reviewText ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (rating < 1) {
      setError("Please select a rating.");
      return;
    }
    if (reviewText.trim().length === 0) {
      setError("Please write a short review.");
      return;
    }

    setSubmitting(true);
    const result = await submitReview({ inquiryId, productId, rating, reviewText });
    setSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      return;
    }

    toast.success(existingReview ? "Review updated." : "Review submitted — thank you!");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{productName}</p>
        {existingReview && (
          <span className="text-xs text-muted-foreground">Editing your review</span>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Your rating</Label>
        <StarRatingInput value={rating} onChange={setRating} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`review-${productId}`}>Your review</Label>
        <Textarea
          id={`review-${productId}`}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="What did you think of this product?"
          rows={3}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button type="submit" size="sm" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {existingReview ? "Update Review" : "Submit Review"}
      </Button>
    </form>
  );
}
