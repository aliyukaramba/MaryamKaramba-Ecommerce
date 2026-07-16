import { prisma } from "@/lib/prisma";
import { HomepageSettingsForm } from "@/components/admin/homepage-settings-form";

export const metadata = { title: "Homepage Settings" };

export default async function HomepageSettingsPage() {
  const settings = await prisma.homepageSettings.findFirst();

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-display text-3xl">Homepage Settings</h1>
      <HomepageSettingsForm
        defaultValues={{
          heroTitle: settings?.heroTitle ?? "",
          heroSubtitle: settings?.heroSubtitle ?? "",
          heroImage: settings?.heroImage ?? "",
          heroCtaText: settings?.heroCtaText ?? "",
          heroCtaLink: settings?.heroCtaLink ?? "",
          bannerImages: settings?.bannerImages ?? [],
          showFeatured: settings?.showFeatured ?? true,
          showTrending: settings?.showTrending ?? true,
          showNewArrival: settings?.showNewArrival ?? true,
          faqs: (settings?.faqs as { question: string; answer: string }[] | null) ?? [],
          testimonials:
            (settings?.testimonials as { name: string; rating: number; text: string }[] | null) ?? [],
        }}
      />
    </div>
  );
}
