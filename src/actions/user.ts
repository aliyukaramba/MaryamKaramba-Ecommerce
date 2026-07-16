"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
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

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "STAFF"]),
});

export async function createAdminUser(input: z.infer<typeof createUserSchema>) {
  try {
    const currentUser = await requireRole(["SUPER_ADMIN"]);
    const parsed = createUserSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid user data.", fieldErrors: parsed.error.flatten().fieldErrors };
    }
    const data = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      return { success: false as const, error: "A user with this email already exists." };
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: sanitizeText(data.name),
        email: data.email.toLowerCase(),
        password: hashedPassword,
        role: data.role,
      },
    });

    await logActivity({
      userId: currentUser.id,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      details: { email: user.email, role: user.role },
    });

    revalidatePath("/admin/users");
    return { success: true as const, userId: user.id };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  try {
    const currentUser = await requireRole(["SUPER_ADMIN"]);

    if (currentUser.id === userId && !isActive) {
      return { success: false as const, error: "You cannot deactivate your own account." };
    }

    await prisma.user.update({ where: { id: userId }, data: { isActive } });

    await logActivity({
      userId: currentUser.id,
      action: "STATUS_CHANGE",
      entity: "User",
      entityId: userId,
      details: { isActive },
    });

    revalidatePath("/admin/users");
    return { success: true as const };
  } catch (error) {
    return handleActionError(error);
  }
}
