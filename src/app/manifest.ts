import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await prisma.businessSettings.findFirst().catch(() => null);
  const name = settings?.businessName ?? "Your Store";

  return {
    name,
    short_name: name,
    description: `Browse ${name}'s catalog and order instantly on WhatsApp.`,
    start_url: "/",
    display: "standalone",
    background_color: "#EFEAE0",
    theme_color: "#16281F",
    icons: [
      {
        src: settings?.favicon ?? "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
