"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth-guard";
import { logActivity } from "@/lib/activity-log";
import type { OrderStatus } from "@prisma/client";

function handleActionError(error: unknown) {
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
    return { success: false as const, error: error.message };
  }
  console.error(error);
  return { success: false as const, error: "Something went wrong. Please try again." };
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "ADMIN", "STAFF"]);

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    await logActivity({
      userId: user.id,
      action: "STATUS_CHANGE",
      entity: "Order",
      entityId: orderId,
      details: { status },
    });

    revalidatePath("/admin/orders");
    return { success: true as const, order };
  } catch (error) {
    return handleActionError(error);
  }
}
