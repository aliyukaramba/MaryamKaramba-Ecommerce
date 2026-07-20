"use server";

import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-session";
import { z } from "zod";

const registerSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(["ios", "android"]),
});

export async function registerPushToken(input: {
  token: string;
  platform: "ios" | "android";
}): Promise<{ success: boolean }> {
  try {
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) return { success: false };

    // Link to the current customer account if they're logged in on this
    // device, so personalized notifications (e.g. "your order shipped")
    // are possible later — but registration works fine for guests too,
    // for broadcast-style notifications like new arrivals.
    const session = await getCustomerSession();

    await prisma.pushToken.upsert({
      where: { token: parsed.data.token },
      update: {
        platform: parsed.data.platform,
        customerAccountId: session?.customerAccountId ?? null,
      },
      create: {
        token: parsed.data.token,
        platform: parsed.data.platform,
        customerAccountId: session?.customerAccountId ?? null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("registerPushToken failed:", error);
    return { success: false };
  }
}
