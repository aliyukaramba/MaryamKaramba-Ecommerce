import type { Metadata } from "next";
import { cache } from "react";
import { Newsreader, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const data = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-data",
  weight: ["400", "500"],
});

// Deduped via React cache() so the same request is reused by both
// generateMetadata and the layout body during a single render pass.
const getSettings = cache(() => prisma.businessSettings.findFirst().catch(() => null));

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const siteName = settings?.businessName ?? "Your Store";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${siteName} — Shop & Order on WhatsApp`,
      template: `%s | ${siteName}`,
    },
    description: `Browse ${siteName}'s catalog and order instantly on WhatsApp — no cart, no checkout, just a chat.`,
    icons: settings?.favicon ? [{ url: settings.favicon }] : undefined,
    openGraph: {
      type: "website",
      siteName,
      title: `${siteName} — Shop & Order on WhatsApp`,
    },
    twitter: {
      card: "summary_large_image",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings?.businessName ?? "Your Store",
    url: siteUrl,
    logo: settings?.logo ?? undefined,
    email: settings?.businessEmail ?? undefined,
    address: settings?.address ?? undefined,
    sameAs: [settings?.facebookUrl, settings?.instagramUrl, settings?.twitterUrl].filter(
      Boolean
    ),
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${display.variable} ${body.variable} ${data.variable} font-body antialiased`}
      >
        {/* eslint-disable-next-line react/no-danger */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
