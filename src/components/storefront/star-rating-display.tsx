import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRatingDisplay({
  rating,
  size = "md",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const dimension = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            dimension,
            star <= Math.round(rating) ? "fill-accent text-accent" : "fill-none text-muted-foreground"
          )}
        />
      ))}
    </div>
  );
}
