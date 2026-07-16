"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity-log";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import { headers } from "next/headers";

const RESET_TOKEN_TTL_MINUTES = 60;

interface RequestPasswordResetResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Always returns a generic success message regardless of whether the email
 * exists — this prevents user enumeration via the forgot-password form.
 */
export async function requestPasswordReset(
  email: string
): Promise<RequestPasswordResetResult> {
  const genericResponse = {
    success: true as const,
    message:
      "If an account exists with that email, a reset link has been sent.",
  };

  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { success: withinLimit } = await rateLimit(`pwreset:${ip}`, 3, 300);
    if (!withinLimit) {
      // Still return the generic message — don't leak rate-limit state either.
      return genericResponse;
    }

    const parsed = requestPasswordResetSchema.safeParse({ email });
    if (!parsed.success) {
      return { success: false as const, error: "Enter a valid email address." };
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    if (user && user.isActive) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiry },
      });

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
      const businessSettings = await prisma.businessSettings.findFirst();

      await sendPasswordResetEmail(user.email, {
        businessName: businessSettings?.businessName ?? "Your Store",
        resetUrl: `${siteUrl}/admin/reset-password?token=${token}`,
        expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
      });

      await logActivity({
        userId: user.id,
        action: "UPDATE",
        entity: "User",
        entityId: user.id,
        details: { passwordResetRequested: true },
      });
    }

    // Same response whether or not the user/email exists.
    return genericResponse;
  } catch (error) {
    console.error("requestPasswordReset failed:", error);
    // Still generic — don't reveal internal errors to an unauthenticated caller.
    return genericResponse;
  }
}

export async function resetPassword(input: {
  token: string;
  password: string;
  confirmPassword: string;
}) {
  try {
    const parsed = resetPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const user = await prisma.user.findFirst({
      where: { resetToken: parsed.data.token },
    });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return {
        success: false as const,
        error: "This reset link is invalid or has expired. Please request a new one.",
      };
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    await logActivity({
      userId: user.id,
      action: "UPDATE",
      entity: "User",
      entityId: user.id,
      details: { passwordReset: true },
    });

    return { success: true as const };
  } catch (error) {
    console.error("resetPassword failed:", error);
    return { success: false as const, error: "Something went wrong. Please try again." };
  }
}
