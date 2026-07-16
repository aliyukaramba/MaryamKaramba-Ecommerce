"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth-guard";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { sendNewsletterWelcomeEmail } from "@/lib/email";

function handleActionError(error: unknown) {
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
    return { success: false as const, error: error.message };
  }
  console.error(error);
  return { success: false as const, error: "Something went wrong. Please try again." };
}

const emailSchema = z.string().email("Enter a valid email address");

export async function subscribeToNewsletter(email: string) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { success: withinLimit } = await rateLimit(`newsletter:${ip}`, 3, 60);
    if (!withinLimit) {
      return { success: false as const, error: "Too many attempts. Please try again shortly." };
    }

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      return { success: false as const, error: "Enter a valid email address." };
    }

    await prisma.newsletter.upsert({
      where: { email: parsed.data.toLowerCase() },
      update: { isSubscribed: true },
      create: { email: parsed.data.toLowerCase(), isSubscribed: true },
    });

    const businessSettings = await prisma.businessSettings.findFirst();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    void sendNewsletterWelcomeEmail(parsed.data.toLowerCase(), {
      businessName: businessSettings?.businessName ?? "Your Store",
      shopUrl: `${siteUrl}/shop`,
    }).catch((error) => console.error("Newsletter welcome email failed:", error));

    return { success: true as const };
  } catch (error) {
    console.error("subscribeToNewsletter failed:", error);
    return { success: false as const, error: "Something went wrong. Please try again." };
  }
}

const businessSettingsSchema = z.object({
  businessName: z.string().min(2).max(150),
  logo: z.string().url().optional().nullable(),
  favicon: z.string().url().optional().nullable(),
  whatsappNumber: z.string().min(7).max(20),
  businessEmail: z.string().email().optional().or(z.literal("")).nullable(),
  businessPhone: z.string().max(20).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  facebookUrl: z.string().url().optional().or(z.literal("")).nullable(),
  instagramUrl: z.string().url().optional().or(z.literal("")).nullable(),
  twitterUrl: z.string().url().optional().or(z.literal("")).nullable(),
  tiktokUrl: z.string().url().optional().or(z.literal("")).nullable(),
  currency: z.string().max(10),
  currencySymbol: z.string().max(5),
  timezone: z.string().max(50),
  primaryColor: z.string().max(20),
  secondaryColor: z.string().max(20),
});

export async function updateBusinessSettings(
  input: z.infer<typeof businessSettingsSchema>
) {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const parsed = businessSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid settings.", fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const existing = await prisma.businessSettings.findFirst();
    const settings = existing
      ? await prisma.businessSettings.update({ where: { id: existing.id }, data: parsed.data })
      : await prisma.businessSettings.create({ data: parsed.data });

    revalidatePath("/", "layout");
    return { success: true as const, settings };
  } catch (error) {
    return handleActionError(error);
  }
}

const homepageSettingsSchema = z.object({
  heroTitle: z.string().max(150).optional().nullable(),
  heroSubtitle: z.string().max(300).optional().nullable(),
  heroImage: z.string().url().optional().or(z.literal("")).nullable(),
  heroCtaText: z.string().max(50).optional().nullable(),
  heroCtaLink: z.string().max(200).optional().nullable(),
  bannerImages: z.array(z.string().url()).default([]),
  showFeatured: z.boolean().default(true),
  showTrending: z.boolean().default(true),
  showNewArrival: z.boolean().default(true),
});

export async function updateHomepageSettings(
  input: z.infer<typeof homepageSettingsSchema>
) {
  try {
    await requireRole(["SUPER_ADMIN", "ADMIN"]);
    const parsed = homepageSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: "Invalid settings.", fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const existing = await prisma.homepageSettings.findFirst();
    const settings = existing
      ? await prisma.homepageSettings.update({ where: { id: existing.id }, data: parsed.data })
      : await prisma.homepageSettings.create({ data: parsed.data });

    revalidatePath("/");
    return { success: true as const, settings };
  } catch (error) {
    return handleActionError(error);
  }
}
