import { prisma } from "@/lib/prisma";
import { BusinessSettingsForm } from "@/components/admin/business-settings-form";

export const metadata = { title: "Business Settings" };

export default async function BusinessSettingsPage() {
  const settings = await prisma.businessSettings.findFirst();

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-display text-3xl">Business Settings</h1>
      <BusinessSettingsForm
        defaultValues={{
          businessName: settings?.businessName ?? "",
          logo: settings?.logo ?? null,
          favicon: settings?.favicon ?? null,
          whatsappNumber: settings?.whatsappNumber ?? "",
          businessEmail: settings?.businessEmail ?? null,
          businessPhone: settings?.businessPhone ?? null,
          address: settings?.address ?? null,
          facebookUrl: settings?.facebookUrl ?? null,
          instagramUrl: settings?.instagramUrl ?? null,
          twitterUrl: settings?.twitterUrl ?? null,
          tiktokUrl: settings?.tiktokUrl ?? null,
          currency: settings?.currency ?? "NGN",
          currencySymbol: settings?.currencySymbol ?? "₦",
          timezone: settings?.timezone ?? "Africa/Lagos",
          primaryColor: settings?.primaryColor ?? "#16281F",
          secondaryColor: settings?.secondaryColor ?? "#ffffff",
        }}
      />
    </div>
  );
}
