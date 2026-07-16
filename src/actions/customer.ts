"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth-guard";
import { logActivity } from "@/lib/activity-log";
import { sanitizeText } from "@/lib/sanitize";

function handleActionError(error: unknown) {
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
    return { success: false as const, error: error.message };
  }
  console.error(error);
  return { success: false as const, error: "Something went wrong. Please try again." };
}

const customerUpdateSchema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  deliveryCity: z.string().min(2).max(100),
  deliveryAddress: z.string().max(500).optional().or(z.literal("")).nullable(),
  notes: z.string().max(1000).optional().or(z.literal("")).nullable(),
});

export async function updateCustomer(
  id: string,
  input: z.infer<typeof customerUpdateSchema>
) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "ADMIN", "STAFF"]);
    const parsed = customerUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid customer data.", fieldErrors: parsed.error.flatten().fieldErrors };
    }
    const data = parsed.data;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        fullName: sanitizeText(data.fullName),
        phone: data.phone.replace(/[^\d+]/g, ""),
        email: data.email || null,
        deliveryCity: sanitizeText(data.deliveryCity),
        deliveryAddress: data.deliveryAddress ? sanitizeText(data.deliveryAddress) : null,
        notes: data.notes ? sanitizeText(data.notes) : null,
      },
    });

    await logActivity({ userId: user.id, action: "UPDATE", entity: "Customer", entityId: id });

    revalidatePath("/admin/customers");
    return { success: true as const, customer };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function searchCustomers(query: string) {
  try {
    await requireRole(["SUPER_ADMIN", "ADMIN", "STAFF"]);

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      include: { _count: { select: { inquiries: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return { success: true as const, customers };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteCustomer(id: string) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "ADMIN"]);

    const inquiryCount = await prisma.inquiry.count({ where: { customerId: id } });
    if (inquiryCount > 0) {
      return { success: false as const, error: `Cannot delete: customer has ${inquiryCount} inquiry record(s).` };
    }

    await prisma.customer.delete({ where: { id } });
    await logActivity({ userId: user.id, action: "DELETE", entity: "Customer", entityId: id });
    revalidatePath("/admin/customers");
    return { success: true as const };
  } catch (error) {
    return handleActionError(error);
  }
}
