"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import { hashResetToken, generateResetToken } from "@/lib/reset-token";
import { logActivity } from "@/lib/activity-log";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  createCustomerSession,
  getCustomerSession,
  clearCustomerSession,
} from "@/lib/customer-session";
import {
  customerRegisterSchema,
  customerLoginSchema,
  customerRequestPasswordResetSchema,
  customerResetPasswordSchema,
  type CustomerRegisterValues,
  type CustomerLoginValues,
} from "@/lib/validations/customer-auth";

// A fixed, valid bcrypt hash computed once at module load, used to burn
// an equivalent amount of time when no matching account exists. Without
// this, a login attempt for a non-existent account returns near-
// instantly (no bcrypt.compare call at all), while an attempt against a
// real account takes bcrypt's usual ~100ms+ — that timing difference is
// itself enough to let an attacker enumerate which phone numbers have
// accounts, purely by measuring response time.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("timing-attack-mitigation-only", 12);

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

async function getClientIp(): Promise<string> {
  const headersList = await headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown"
  );
}

/** Logs a customer-facing auth event. Never pass a password or token in. */
async function logCustomerAuthEvent(input: {
  action: "CREATE" | "LOGIN" | "LOGOUT" | "UPDATE";
  customerAccountId?: string;
  details?: Record<string, unknown>;
}) {
  await logActivity({
    userId: null, // ActivityLog.userId is a FK to the admin User model, not CustomerAccount
    action: input.action,
    entity: "CustomerAccount",
    entityId: input.customerAccountId,
    details: input.details,
  });
}

export interface CustomerAuthResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function registerCustomerAccount(
  input: CustomerRegisterValues
): Promise<CustomerAuthResult> {
  try {
    const ip = await getClientIp();
    const { success: withinLimit } = await rateLimit(`customer-register:${ip}`, 5, 300);
    if (!withinLimit) {
      return { success: false, error: "Too many attempts. Please wait a few minutes." };
    }

    const parsed = customerRegisterSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { fullName, phone, email, password } = parsed.data;
    const normalizedPhone = normalizePhone(phone);

    const existing = await prisma.customerAccount.findUnique({
      where: { phone: normalizedPhone },
    });
    if (existing) {
      return {
        success: false,
        error: "An account with this phone number already exists. Try logging in instead.",
      };
    }

    if (email) {
      const emailTaken = await prisma.customerAccount.findUnique({ where: { email } });
      if (emailTaken) {
        return { success: false, error: "An account with this email already exists." };
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const account = await prisma.customerAccount.create({
      data: {
        fullName: sanitizeText(fullName),
        phone: normalizedPhone,
        email: email || null,
        password: hashedPassword,
      },
    });

    await createCustomerSession(account.id);
    await logCustomerAuthEvent({
      action: "CREATE",
      customerAccountId: account.id,
      details: { method: "phone" },
    });

    return { success: true };
  } catch (error) {
    console.error("registerCustomerAccount failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function loginCustomerAccount(
  input: CustomerLoginValues
): Promise<CustomerAuthResult> {
  try {
    const ip = await getClientIp();
    const { success: withinLimit } = await rateLimit(`customer-login:${ip}`, 8, 300);
    if (!withinLimit) {
      return { success: false, error: "Too many attempts. Please wait a few minutes." };
    }

    const parsed = customerLoginSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const normalizedPhone = normalizePhone(parsed.data.phone);

    const account = await prisma.customerAccount.findUnique({
      where: { phone: normalizedPhone },
    });

    // Deliberately generic error for both "no such account" and "wrong
    // password" — distinguishing them lets an attacker enumerate which
    // phone numbers have accounts.
    const genericError = "Incorrect phone number or password.";

    if (!account || !account.password) {
      // Still run a bcrypt comparison against a dummy hash, purely to
      // keep response timing consistent with the "account exists, wrong
      // password" path below — see DUMMY_PASSWORD_HASH above.
      await bcrypt.compare(parsed.data.password, DUMMY_PASSWORD_HASH);
      await logCustomerAuthEvent({
        action: "LOGIN",
        details: { success: false, phone: normalizedPhone },
      });
      return { success: false, error: genericError };
    }

    const isValid = await bcrypt.compare(parsed.data.password, account.password);
    if (!isValid) {
      await logCustomerAuthEvent({
        action: "LOGIN",
        customerAccountId: account.id,
        details: { success: false },
      });
      return { success: false, error: genericError };
    }

    await createCustomerSession(account.id);
    await logCustomerAuthEvent({
      action: "LOGIN",
      customerAccountId: account.id,
      details: { success: true, method: "phone" },
    });

    return { success: true };
  } catch (error) {
    console.error("loginCustomerAccount failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function logoutCustomerAccount(): Promise<{ success: boolean }> {
  const session = await getCustomerSession();
  await clearCustomerSession();
  if (session) {
    await logCustomerAuthEvent({ action: "LOGOUT", customerAccountId: session.customerAccountId });
  }
  return { success: true };
}

export interface CurrentCustomerAccount {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  lastDeliveryCity: string | null;
  lastDeliveryAddress: string | null;
}

/**
 * Reads the current customer session (if any) and returns fresh account
 * data from the database — never trust display data baked into the JWT
 * itself, since name/email could have changed since it was issued.
 * Returns null if not logged in or the session is invalid/expired.
 */
export async function getCurrentCustomerAccount(): Promise<CurrentCustomerAccount | null> {
  const session = await getCustomerSession();
  if (!session) return null;

  try {
    const account = await prisma.customerAccount.findUnique({
      where: { id: session.customerAccountId },
    });
    if (!account) return null;

    const lastOrder = await prisma.customer.findFirst({
      where: { customerAccountId: account.id },
      orderBy: { createdAt: "desc" },
      select: { deliveryCity: true, deliveryAddress: true },
    });

    return {
      id: account.id,
      fullName: account.fullName,
      phone: account.phone,
      email: account.email,
      lastDeliveryCity: lastOrder?.deliveryCity ?? null,
      lastDeliveryAddress: lastOrder?.deliveryAddress ?? null,
    };
  } catch (error) {
    console.error("getCurrentCustomerAccount failed:", error);
    return null;
  }
}

/**
 * Called only from the Google OAuth callback route handler.
 * Links to an existing account by verified email if one exists —
 * otherwise a customer who registered with phone+password using the
 * same email, then later tries "Continue with Google", would end up
 * with two separate accounts and a split order history.
 */
export async function upsertGoogleCustomerAccount(profile: {
  googleId: string;
  email: string;
  fullName: string;
}): Promise<{ accountId: string }> {
  const normalizedEmail = profile.email.toLowerCase().trim();

  const existingByGoogleId = await prisma.customerAccount.findUnique({
    where: { googleId: profile.googleId },
  });
  if (existingByGoogleId) {
    await logCustomerAuthEvent({
      action: "LOGIN",
      customerAccountId: existingByGoogleId.id,
      details: { success: true, method: "google" },
    });
    return { accountId: existingByGoogleId.id };
  }

  const existingByEmail = await prisma.customerAccount.findUnique({
    where: { email: normalizedEmail },
  });
  if (existingByEmail) {
    const updated = await prisma.customerAccount.update({
      where: { id: existingByEmail.id },
      data: { googleId: profile.googleId },
    });
    await logCustomerAuthEvent({
      action: "LOGIN",
      customerAccountId: updated.id,
      details: { success: true, method: "google", linkedExistingAccount: true },
    });
    return { accountId: updated.id };
  }

  const created = await prisma.customerAccount.create({
    data: {
      googleId: profile.googleId,
      email: normalizedEmail,
      fullName: sanitizeText(profile.fullName),
    },
  });
  await logCustomerAuthEvent({
    action: "CREATE",
    customerAccountId: created.id,
    details: { method: "google" },
  });
  return { accountId: created.id };
}

// ---------------------------------------------------------------------------
// Password reset (customer accounts) — same design as the admin reset flow:
// hashed tokens, time-limited, one-time use, generic responses.
// ---------------------------------------------------------------------------

const RESET_TOKEN_TTL_MINUTES = 60;

interface CustomerPasswordResetResult {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Always returns a generic message regardless of whether the email
 * exists or has a password set — prevents account enumeration.
 */
export async function requestCustomerPasswordReset(
  email: string
): Promise<CustomerPasswordResetResult> {
  const genericResponse = {
    success: true as const,
    message: "If an account exists with that email, a reset link has been sent.",
  };

  try {
    const ip = await getClientIp();
    const { success: withinLimit } = await rateLimit(`customer-pwreset:${ip}`, 3, 300);
    if (!withinLimit) return genericResponse;

    const parsed = customerRequestPasswordResetSchema.safeParse({ email });
    if (!parsed.success) {
      return { success: false, error: "Enter a valid email address." };
    }

    const account = await prisma.customerAccount.findUnique({
      where: { email: parsed.data.email },
    });

    // Only proceed if the account exists AND has a password — a
    // Google-only account has nothing to "reset" here; sending a link
    // for it would just confuse the customer into thinking they have a
    // password when they don't, so we silently no-op (still returning
    // the same generic response either way).
    if (account && account.password) {
      const rawToken = generateResetToken();
      const expiry = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

      await prisma.customerAccount.update({
        where: { id: account.id },
        data: { resetTokenHash: hashResetToken(rawToken), resetTokenExpiry: expiry },
      });

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
      const businessSettings = await prisma.businessSettings.findFirst();

      await sendPasswordResetEmail(account.email!, {
        businessName: businessSettings?.businessName ?? "Your Store",
        resetUrl: `${siteUrl}/account/reset-password?token=${rawToken}`,
        expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
      });

      await logCustomerAuthEvent({
        action: "UPDATE",
        customerAccountId: account.id,
        details: { passwordResetRequested: true },
      });
    }

    return genericResponse;
  } catch (error) {
    console.error("requestCustomerPasswordReset failed:", error);
    return genericResponse;
  }
}

export async function resetCustomerPassword(input: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<CustomerPasswordResetResult> {
  try {
    const parsed = customerResetPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const tokenHash = hashResetToken(parsed.data.token);

    const account = await prisma.customerAccount.findFirst({
      where: { resetTokenHash: tokenHash },
    });

    if (!account || !account.resetTokenExpiry || account.resetTokenExpiry < new Date()) {
      return {
        success: false,
        error: "This reset link is invalid or has expired. Please request a new one.",
      };
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

    await prisma.customerAccount.update({
      where: { id: account.id },
      data: {
        password: hashedPassword,
        resetTokenHash: null,
        resetTokenExpiry: null,
      },
    });

    await logCustomerAuthEvent({
      action: "UPDATE",
      customerAccountId: account.id,
      details: { passwordReset: true },
    });

    return { success: true };
  } catch (error) {
    console.error("resetCustomerPassword failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
