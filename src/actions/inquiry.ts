"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { inquiryFormSchema, type InquiryFormValues } from "@/lib/validations/inquiry";
import { sanitizeText } from "@/lib/sanitize";
import { rateLimit } from "@/lib/rate-limit";
import { generateInquiryNumber, buildWhatsAppMessage, buildWhatsAppLink } from "@/lib/whatsapp";
import { logActivity } from "@/lib/activity-log";
import { formatCurrency } from "@/lib/utils";
import { sendInquiryConfirmationEmail, sendAdminNotificationEmail } from "@/lib/email";

export interface CreateInquiryResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  whatsappUrl?: string;
  inquiryNumber?: string;
}

export async function createInquiry(
  input: InquiryFormValues
): Promise<CreateInquiryResult> {
  // ---- 1. Rate limit by IP (5 inquiries per 5 minutes) ----
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  const { success: withinLimit } = await rateLimit(`inquiry:${ip}`, 5, 300);
  if (!withinLimit) {
    return {
      success: false as const,
      error: "Too many requests. Please wait a few minutes and try again.",
    };
  }

  // ---- 2. Validate ----
  const parsed = inquiryFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: "Please correct the errors in the form.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  // ---- 3. Sanitize free-text fields ----
  const fullName = sanitizeText(data.fullName);
  const deliveryCity = sanitizeText(data.deliveryCity);
  const deliveryAddress = data.deliveryAddress ? sanitizeText(data.deliveryAddress) : null;
  const notes = data.notes ? sanitizeText(data.notes) : null;
  const phone = data.phone.replace(/[^\d+]/g, "");

  try {
    // ---- 4. Fetch products/variants to get authoritative server-side prices ----
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
      productSlug: string;
    }[] = [];

    for (const item of data.items) {
      const product = productMap.get(item.productId);
      if (!product || product.status !== "PUBLISHED") {
        return { success: false as const, error: "One of the selected products is unavailable." };
      }

      let unitPrice = Number(product.salePrice ?? product.price);
      let sku = product.sku;
      let stockAvailable = product.stock;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant || !variant.isActive) {
          return { success: false as const, error: `Selected variant for "${product.name}" is unavailable.` };
        }
        unitPrice += Number(variant.priceAdjustment);
        sku = variant.sku;
        stockAvailable = variant.quantity;
      }

      if (stockAvailable < item.quantity) {
        return {
          success: false as const,
          error: `Only ${stockAvailable} unit(s) of "${product.name}" left in stock.`,
        };
      }

      resolvedItems.push({
        productId: product.id,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
        color: item.color ?? null,
        size: item.size ?? null,
        productName: product.name,
        sku,
        productSlug: product.slug,
      });
    }

    const grandTotal = resolvedItems.reduce((sum, i) => sum + i.totalPrice, 0);

    // ---- 5. Persist atomically: customer, inquiry, items, product counters ----
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          fullName,
          phone,
          email: data.email || null,
          deliveryCity,
          deliveryAddress,
          notes,
        },
      });

      const inquiryCount = await tx.inquiry.count();
      const inquiryNumber = generateInquiryNumber(inquiryCount + 1);

      const inquiry = await tx.inquiry.create({
        data: {
          inquiryNumber,
          customerId: customer.id,
          totalAmount: grandTotal,
          notes,
          status: "NEW",
          items: {
            create: resolvedItems.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice,
              color: i.color,
              size: i.size,
            })),
          },
        },
      });

      // increment product contact counters
      for (const item of resolvedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { contactCount: { increment: 1 } },
        });
      }

      return { customer, inquiry, inquiryNumber };
    });

    // ---- 6. Build WhatsApp message + link ----
    const businessSettings = await prisma.businessSettings.findFirst();
    const whatsappNumber =
      businessSettings?.whatsappNumber ?? process.env.WHATSAPP_NUMBER ?? "";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const currencySymbol = businessSettings?.currencySymbol ?? "₦";

    const message = buildWhatsAppMessage({
      inquiryNumber: result.inquiryNumber,
      customerName: fullName,
      phone,
      city: deliveryCity,
      address: deliveryAddress,
      notes,
      items: resolvedItems.map((i) => ({
        productName: i.productName,
        sku: i.sku,
        color: i.color,
        size: i.size,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        productSlug: i.productSlug,
      })),
      grandTotal,
      siteUrl,
      currencySymbol,
    });

    const whatsappUrl = buildWhatsAppLink(whatsappNumber, message);

    await prisma.inquiry.update({
      where: { id: result.inquiry.id },
      data: { whatsappSent: true },
    });

    await logActivity({
      action: "CREATE",
      entity: "Inquiry",
      entityId: result.inquiry.id,
      details: { inquiryNumber: result.inquiryNumber, total: grandTotal },
    });

    // Email is optional and best-effort — WhatsApp is the real order
    // channel, so a slow or misconfigured email provider must never delay
    // or fail the response the customer is waiting on.
    const itemsSummary = resolvedItems
      .map((i) => `${i.productName} (x${i.quantity})`)
      .join(", ");
    void Promise.all([
      data.email
        ? sendInquiryConfirmationEmail(data.email, {
            businessName: businessSettings?.businessName ?? "Your Store",
            customerName: fullName,
            inquiryNumber: result.inquiryNumber,
            itemsSummary,
            total: formatCurrency(grandTotal, currencySymbol),
          })
        : Promise.resolve(false),
      sendAdminNotificationEmail({
        inquiryNumber: result.inquiryNumber,
        customerName: fullName,
        customerPhone: phone,
        itemsSummary,
        total: formatCurrency(grandTotal, currencySymbol),
        adminUrl: `${siteUrl}/admin/inquiries/${result.inquiry.id}`,
      }),
    ]).catch((error) => console.error("Post-inquiry email dispatch failed:", error));

    return {
      success: true as const,
      whatsappUrl,
      inquiryNumber: result.inquiryNumber,
    };
  } catch (error) {
    console.error("createInquiry failed:", error);
    return {
      success: false as const,
      error: "Something went wrong while submitting your order. Please try again.",
    };
  }
}
