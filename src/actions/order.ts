"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import { generateOrderNumber, generatePaymentReference } from "@/lib/order-number";
import { nairaToKobo, verifyTopifyTransaction } from "@/lib/topify";
import { getCustomerSession } from "@/lib/customer-session";
import { logActivity } from "@/lib/activity-log";
import type { OrderStatus } from "@prisma/client";

const checkoutItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().nullable(),
  quantity: z.number().int().min(1).max(999),
  color: z.string().nullable(),
  size: z.string().nullable(),
});

const checkoutSchema = z.object({
  fullName: z.string().min(2, "Enter your full name").max(120),
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .max(20)
    .regex(/^[\d+\s()-]+$/, "Enter a valid phone number"),
  email: z.string().email("A valid email is required for payment"),
  deliveryCity: z.string().min(2, "Delivery city is required").max(100),
  deliveryAddress: z.string().max(500).optional().or(z.literal("")).nullable(),
  notes: z.string().max(1000).optional().or(z.literal("")).nullable(),
  items: z.array(checkoutItemSchema).min(1, "Your cart is empty"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export interface InitiateOrderResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  reference?: string;
  amountKobo?: number;
  email?: string;
  orderNumber?: string;
}

export async function initiateOrder(input: CheckoutInput): Promise<InitiateOrderResult> {
  try {
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersList.get("x-real-ip") ??
      "unknown";

    const { success: withinLimit } = await rateLimit(`checkout:${ip}`, 8, 300);
    if (!withinLimit) {
      return { success: false, error: "Too many attempts. Please wait a few minutes and try again." };
    }

    const parsed = checkoutSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Please correct the errors in the form.",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = parsed.data;
    const fullName = sanitizeText(data.fullName);
    const deliveryCity = sanitizeText(data.deliveryCity);
    const deliveryAddress = data.deliveryAddress ? sanitizeText(data.deliveryAddress) : null;
    const notes = data.notes ? sanitizeText(data.notes) : null;
    const phone = data.phone.replace(/[^\d+]/g, "");

    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { variants: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const resolvedItems: {
      productId: string;
      variantId: string | null;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      color: string | null;
      size: string | null;
      productName: string;
      sku: string;
    }[] = [];

    for (const item of data.items) {
      const product = productMap.get(item.productId);
      if (!product || product.status !== "PUBLISHED") {
        return { success: false, error: "One of the items in your cart is no longer available." };
      }

      let unitPrice = Number(product.salePrice ?? product.price);
      let sku = product.sku;
      let stockAvailable = product.stock;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant || !variant.isActive) {
          return { success: false, error: `Selected variant for "${product.name}" is unavailable.` };
        }
        unitPrice += Number(variant.priceAdjustment);
        sku = variant.sku;
        stockAvailable = variant.quantity;
      }

      if (stockAvailable < item.quantity) {
        return {
          success: false,
          error: `Only ${stockAvailable} unit(s) of "${product.name}" left in stock.`,
        };
      }

      resolvedItems.push({
        productId: product.id,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
        color: item.color,
        size: item.size,
        productName: product.name,
        sku,
      });
    }

    const total = resolvedItems.reduce((sum, i) => sum + i.totalPrice, 0);
    if (total <= 0) {
      return { success: false, error: "Order total must be greater than zero." };
    }

    const customerSession = await getCustomerSession();

    const order = await prisma.$transaction(async (tx) => {
      const orderCount = await tx.order.count();
      const orderNumber = generateOrderNumber(orderCount + 1);
      const paymentReference = generatePaymentReference(orderNumber);

      return tx.order.create({
        data: {
          orderNumber,
          fullName,
          phone,
          email: data.email,
          deliveryCity,
          deliveryAddress,
          notes,
          customerAccountId: customerSession?.customerAccountId ?? null,
          status: "PENDING_PAYMENT",
          subtotal: total,
          total,
          paymentReference,
          items: {
            create: resolvedItems.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              productName: i.productName,
              sku: i.sku,
              color: i.color,
              size: i.size,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice,
            })),
          },
        },
      });
    });

    return {
      success: true,
      reference: order.paymentReference,
      amountKobo: nairaToKobo(total),
      email: data.email,
      orderNumber: order.orderNumber,
    };
  } catch (error) {
    console.error("initiateOrder failed:", error);
    return { success: false, error: "Something went wrong while starting checkout. Please try again." };
  }
}

export interface ConfirmOrderResult {
  success: boolean;
  status?: OrderStatus;
  error?: string;
  orderNumber?: string;
}

/**
 * The single, authoritative path for marking an order paid. Called from
 * two places — the client's onSuccess callback (fast feedback for the
 * customer) and the Topify webhook (the durable, authoritative source of
 * truth that still works even if the customer closes the tab before
 * onSuccess fires). Both paths funnel through here, and this function is
 * fully idempotent: calling it twice for the same reference is always
 * safe and never double-processes a payment or double-decrements stock.
 */
export async function confirmOrderPayment(reference: string): Promise<ConfirmOrderResult> {
  try {
    const order = await prisma.order.findUnique({
      where: { paymentReference: reference },
      include: { items: true },
    });

    if (!order) {
      return { success: false, error: "Order not found." };
    }

    if (order.status !== "PENDING_PAYMENT") {
      return { success: true, status: order.status, orderNumber: order.orderNumber };
    }

    const verified = await verifyTopifyTransaction(reference);

    if (verified.status !== "success") {
      return { success: false, error: `Payment not confirmed (status: ${verified.status}).` };
    }

    const expectedKobo = nairaToKobo(Number(order.total));
    if (verified.amount !== expectedKobo) {
      console.error(
        `Amount mismatch for order ${order.orderNumber}: expected ${expectedKobo} kobo, Topify reports ${verified.amount} kobo.`
      );
      return { success: false, error: "Payment amount mismatch — this order requires manual review." };
    }

    const result = await prisma.$transaction(async (tx) => {
      let stockConflict = false;

      for (const item of order.items) {
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          if (!variant || variant.quantity < item.quantity) {
            stockConflict = true;
            break;
          }
        } else {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product || product.stock < item.quantity) {
            stockConflict = true;
            break;
          }
        }
      }

      if (stockConflict) {
        return tx.order.update({
          where: { id: order.id },
          data: {
            status: "PAYMENT_STOCK_CONFLICT",
            providerRawStatus: verified.status,
            paidAt: new Date(),
          },
        });
      }

      for (const item of order.items) {
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          if (variant) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { quantity: variant.quantity - item.quantity },
            });
          }
        }
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product) {
          const newStock = Math.max(0, product.stock - item.quantity);
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: newStock },
          });
          await tx.inventory.create({
            data: {
              productId: item.productId,
              type: "SALE",
              quantity: -item.quantity,
              previousStock: product.stock,
              newStock,
              reason: `Paid order ${order.orderNumber}`,
              reference: order.orderNumber,
            },
          });
        }
      }

      return tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          providerRawStatus: verified.status,
          paidAt: new Date(),
        },
      });
    });

    await logActivity({
      action: "STATUS_CHANGE",
      entity: "Order",
      entityId: order.id,
      details: { orderNumber: order.orderNumber, newStatus: result.status },
    });

    return { success: true, status: result.status, orderNumber: order.orderNumber };
  } catch (error) {
    console.error("confirmOrderPayment failed:", error);
    return { success: false, error: "Something went wrong while confirming payment." };
  }
}

export async function getOrderByReference(reference: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { paymentReference: reference },
      include: { items: { include: { product: true } } },
    });
    return order;
  } catch (error) {
    console.error("getOrderByReference failed:", error);
    return null;
  }
}
