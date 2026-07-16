"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth-guard";
import { logActivity } from "@/lib/activity-log";
import { inquiryStatusUpdateSchema } from "@/lib/validations/inquiry";
import type { InquiryStatus } from "@prisma/client";

function handleActionError(error: unknown) {
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
    return { success: false as const, error: error.message };
  }
  console.error(error);
  return { success: false as const, error: "Something went wrong. Please try again." };
}

export async function updateInquiryStatus(inquiryId: string, status: InquiryStatus) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "ADMIN", "STAFF"]);
    const parsed = inquiryStatusUpdateSchema.safeParse({ inquiryId, status });
    if (!parsed.success) {
      return { success: false as const, error: "Invalid status update." };
    }

    const inquiry = await prisma.inquiry.update({
      where: { id: inquiryId },
      data: { status },
    });

    await logActivity({
      userId: user.id,
      action: "STATUS_CHANGE",
      entity: "Inquiry",
      entityId: inquiryId,
      details: { status },
    });

    revalidatePath("/admin/inquiries");
    return { success: true as const, inquiry };
  } catch (error) {
    return handleActionError(error);
  }
}

export interface InquiryFilters {
  query?: string;
  status?: InquiryStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export async function listInquiries(filters: InquiryFilters = {}) {
  try {
    await requireRole(["SUPER_ADMIN", "ADMIN", "STAFF"]);

    const { query, status, dateFrom, dateTo, page = 1, pageSize = 20 } = filters;

    const where = {
      ...(status ? { status } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
      ...(query
        ? {
            OR: [
              { inquiryNumber: { contains: query, mode: "insensitive" as const } },
              { customer: { fullName: { contains: query, mode: "insensitive" as const } } },
              { customer: { phone: { contains: query } } },
              { items: { some: { product: { name: { contains: query, mode: "insensitive" as const } } } } },
              { items: { some: { product: { sku: { contains: query, mode: "insensitive" as const } } } } },
            ],
          }
        : {}),
    };

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        include: {
          customer: true,
          items: { include: { product: true, variant: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.inquiry.count({ where }),
    ]);

    return { success: true as const, inquiries, total, page, pageSize };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Returns a flat, export-ready row set for CSV/Excel generation.
 * The actual file writing happens in the API route (exceljs/papaparse),
 * keeping this action free of Node-only buffer logic.
 */
export async function getInquiriesForExport(filters: InquiryFilters = {}) {
  try {
    await requireRole(["SUPER_ADMIN", "ADMIN", "STAFF"]);

    const { query, status, dateFrom, dateTo } = filters;

    const where = {
      ...(status ? { status } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
      ...(query
        ? {
            OR: [
              { inquiryNumber: { contains: query, mode: "insensitive" as const } },
              { customer: { fullName: { contains: query, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const inquiries = await prisma.inquiry.findMany({
      where,
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });

    const rows = inquiries.flatMap((inq) =>
      inq.items.map((item) => ({
        inquiryNumber: inq.inquiryNumber,
        status: inq.status,
        date: inq.createdAt.toISOString(),
        customerName: inq.customer.fullName,
        phone: inq.customer.phone,
        city: inq.customer.deliveryCity,
        product: item.product.name,
        sku: item.product.sku,
        color: item.color ?? "",
        size: item.size ?? "",
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        inquiryTotal: Number(inq.totalAmount),
      }))
    );

    return { success: true as const, rows };
  } catch (error) {
    return handleActionError(error);
  }
}
