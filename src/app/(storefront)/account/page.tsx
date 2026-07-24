import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getCurrentCustomerAccount } from "@/actions/customer-auth";
import { getMyReviewsForInquiry } from "@/actions/review";
import { AccountAuthPanel } from "@/components/storefront/account-auth-panel";
import { AccountLogoutButton } from "@/components/storefront/account-logout-button";
import { ConfirmDeliveryButton } from "@/components/storefront/confirm-delivery-button";
import { ReviewForm } from "@/components/storefront/review-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "My Account" };

export default async function AccountPage() {
  const account = await getCurrentCustomerAccount();

  if (!account) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <AccountAuthPanel />
      </div>
    );
  }

  const inquiries = await prisma.inquiry.findMany({
    where: { customer: { customerAccountId: account.id } },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">My Orders</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {account.fullName} ({account.phone})
          </p>
        </div>
        <AccountLogoutButton />
      </div>

      {inquiries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-20 text-center">
          <p className="text-muted-foreground">You haven&apos;t placed any orders yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inq) => (
            <InquiryCard key={inq.id} inquiry={inq} />
          ))}
        </div>
      )}
    </div>
  );
}

async function InquiryCard({
  inquiry,
}: {
  inquiry: Awaited<ReturnType<typeof prisma.inquiry.findMany>>[number] & {
    items: Array<{
      id: string;
      productId: string;
      color: string | null;
      size: string | null;
      quantity: number;
      totalPrice: unknown;
      product: { name: string };
    }>;
  };
}) {
  const isDelivered = inquiry.status === "DELIVERED";
  const isCompleted = inquiry.status === "COMPLETED";

  const myReviews = isCompleted ? await getMyReviewsForInquiry(inquiry.id) : [];
  const reviewsByProductId = new Map(myReviews.map((r) => [r.productId, r]));

  // De-duplicate products within this order — a product could appear as
  // more than one line item (different variants), but it only needs one
  // review per order per product.
  const uniqueProducts = Array.from(
    new Map(inquiry.items.map((item) => [item.productId, item.product.name])).entries()
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-data text-sm text-muted-foreground">{inquiry.inquiryNumber}</p>
          <p className="text-xs text-muted-foreground">{formatDate(inquiry.createdAt)}</p>
        </div>
        <Badge variant={isCompleted ? "accent" : "secondary"}>
          {inquiry.status.replace("_", " ")}
        </Badge>
      </div>

      <ul className="space-y-1 text-sm">
        {inquiry.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between">
            <span>
              {item.product.name}
              {item.color ? ` — ${item.color}` : ""}
              {item.size ? ` / ${item.size}` : ""} × {item.quantity}
            </span>
            <span className="font-data text-muted-foreground">
              {formatCurrency(Number(item.totalPrice))}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="font-data font-semibold">
          {formatCurrency(Number(inquiry.totalAmount))}
        </span>
      </div>

      {isDelivered && (
        <div className="mt-4 border-t border-border pt-4">
          <ConfirmDeliveryButton inquiryId={inquiry.id} />
        </div>
      )}

      {isCompleted && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <p className="text-sm font-medium">Leave a review</p>
          {uniqueProducts.map(([productId, productName]) => {
            const existing = reviewsByProductId.get(productId);
            return (
              <ReviewForm
                key={productId}
                inquiryId={inquiry.id}
                productId={productId}
                productName={productName}
                existingReview={
                  existing ? { rating: existing.rating, reviewText: existing.reviewText } : null
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
