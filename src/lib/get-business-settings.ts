import { prisma } from "@/lib/prisma";

export interface ResolvedBusinessSettings {
  businessName: string;
  whatsappNumber: string;
  businessEmail: string | null;
  address: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  currencySymbol: string;
  logo: string | null;
}

const FALLBACK: ResolvedBusinessSettings = {
  businessName: "Your Store",
  whatsappNumber: process.env.WHATSAPP_NUMBER ?? "2348012345678",
  businessEmail: null,
  address: null,
  facebookUrl: null,
  instagramUrl: null,
  twitterUrl: null,
  currencySymbol: "₦",
  logo: null,
};

export async function getBusinessSettings(): Promise<ResolvedBusinessSettings> {
  try {
    const settings = await prisma.businessSettings.findFirst();
    if (!settings) return FALLBACK;

    return {
      businessName: settings.businessName || FALLBACK.businessName,
      whatsappNumber: settings.whatsappNumber || FALLBACK.whatsappNumber,
      businessEmail: settings.businessEmail,
      address: settings.address,
      facebookUrl: settings.facebookUrl,
      instagramUrl: settings.instagramUrl,
      twitterUrl: settings.twitterUrl,
      currencySymbol: settings.currencySymbol || FALLBACK.currencySymbol,
      logo: settings.logo,
    };
  } catch (error) {
    console.error("getBusinessSettings failed, using fallback:", error);
    return FALLBACK;
  }
}
