"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-session";
import { logActivity } from "@/lib/activity-log";
import { sanitizeText } from "@/lib/sanitize";

function handleError(error: unknown) {
  console.error(error);
  return { success: false as const, error: "Something went wrong. Please try again." };
}

/**
 * Recomputes and stores a product's denormalized average rating and
 * review count. Called after every review create/update — never
 * written to from anywhere else, so this stays the single source of
 * truth for how that aggregate gets refreshed.
 */
async function recomputeProductRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      averageRating: agg._avg.rating,
      reviewCount: agg._count,
    },
  });
}

export interface ConfirmDeliveryResult {
  success: boolean;
  error?: string;
}

/**
 * The customer confirms they've received their order. Only reachable by
 * the customer who actually placed it, and only from DELIVERED — an
 * admin marking something Delivered does not itself complete the order;
 * only the customer's own confirmation does.
 */
export async function confirmDelivery(inquiryId: string): Promise<ConfirmDeliveryResult> {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return { success: false, error: "Please log in to confirm your order." };
    }

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
      include: { customer: true },
    });

    if (!inquiry) {
      return { success: false, error: "Order not found." };
    }

    if (inquiry.customer.customerAccountId !== session.customerAccountId) {
      // Deliberately generic — never reveal whether the order exists
      // under someone else's account.
      return { success: false, error: "Order not found." };
    }

    if (inquiry.status !== "DELIVERED") {
      return {
        success: false,
        error: "This order can only be confirmed once it has been marked as delivered.",
      };
    }

    await prisma.inquiry.update({
      where: { id: inquiryId },
      data: { status: "COMPLETED" },
    });

    await logActivity({
      action: "STATUS_CHANGE",
      entity: "Inquiry",
      entityId: inquiryId,
      details: { status: "COMPLETED", confirmedByCustomer: true },
    });

    revalidatePath("/account");
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

const reviewSchema = z.object({
  inquiryId: z.string(),
  productId: z.string(),
  rating: z.number().int().min(1, "Please select a rating").max(5),
  reviewText: z.string().min(1, "Please write a short review").max(2000),
});

export interface SubmitReviewResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Creates or updates (upserts) a customer's review for one product
 * within one order. Enforces, server-side, every condition in the
 * requirement: logged in, order belongs to them, order is COMPLETED
 * (delivery confirmed), and the product was actually part of that order.
 */
export async function submitReview(input: {
  inquiryId: string;
  productId: string;
  rating: number;
  reviewText: string;
}): Promise<SubmitReviewResult> {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return { success: false, error: "Please log in to leave a review." };
    }

    const parsed = reviewSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }
    const data = parsed.data;

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: data.inquiryId },
      include: { customer: true, items: true },
    });

    if (!inquiry) {
      return { success: false, error: "Order not found." };
    }

    if (inquiry.customer.customerAccountId !== session.customerAccountId) {
      return { success: false, error: "Order not found." };
    }

    if (inquiry.status !== "COMPLETED") {
      return {
        success: false,
        error: "You can only review products after confirming delivery of this order.",
      };
    }

    const wasPurchased = inquiry.items.some((item) => item.productId === data.productId);
    if (!wasPurchased) {
      return { success: false, error: "This product wasn't part of that order." };
    }

    await prisma.review.upsert({
      where: {
        inquiryId_productId: {
          inquiryId: data.inquiryId,
          productId: data.productId,
        },
      },
      update: {
        rating: data.rating,
        reviewText: sanitizeText(data.reviewText),
      },
      create: {
        inquiryId: data.inquiryId,
        productId: data.productId,
        customerAccountId: session.customerAccountId,
        rating: data.rating,
        reviewText: sanitizeText(data.reviewText),
      },
    });

    await recomputeProductRating(data.productId);

    revalidatePath("/account");
    revalidatePath("/product", "layout");

    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function getMyReviewsForInquiry(inquiryId: string) {
  try {
    const session = await getCustomerSession();
    if (!session) return [];

    const reviews = await prisma.review.findMany({
      where: { inquiryId, customerAccountId: session.customerAccountId },
    });

    return reviews;
  } catch (error) {
    console.error("getMyReviewsForInquiry failed:", error);
    return [];
  }
}

export async function getProductReviews(productId: string, take = 20) {
  try {
    const reviews = await prisma.review.findMany({
      where: { productId },
      include: { customerAccount: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take,
    });
    return reviews;
  } catch (error) {
    console.error("getProductReviews failed:", error);
    return [];
  }
}
