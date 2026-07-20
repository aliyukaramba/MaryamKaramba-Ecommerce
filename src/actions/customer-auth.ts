"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import {
  createCustomerSession,
  getCustomerSession,
  clearCustomerSession,
} from "@/lib/customer-session";
import {
  customerRegisterSchema,
  customerLoginSchema,
  type CustomerRegisterValues,
  type CustomerLoginValues,
} from "@/lib/validations/customer-auth";

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

    if (!account) {
      return { success: false, error: genericError };
    }

    const isValid = await bcrypt.compare(parsed.data.password, account.password);
    if (!isValid) {
      return { success: false, error: genericError };
    }

    await createCustomerSession(account.id);

    return { success: true };
  } catch (error) {
    console.error("loginCustomerAccount failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function logoutCustomerAccount(): Promise<{ success: boolean }> {
  await clearCustomerSession();
  return { success: true };
}

export interface CurrentCustomerAccount {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  // Best-effort prefill from their most recent order, if any — the
  // account itself doesn't store a delivery address, since that can
  // legitimately differ order to order.
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
