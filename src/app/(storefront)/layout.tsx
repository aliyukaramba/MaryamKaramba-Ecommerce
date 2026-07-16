import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { getBusinessSettings } from "@/lib/get-business-settings";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getBusinessSettings();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader businessName={settings.businessName} />
      <main className="flex-1">{children}</main>
      <SiteFooter
        businessName={settings.businessName}
        address={settings.address}
        businessEmail={settings.businessEmail}
        facebookUrl={settings.facebookUrl}
        instagramUrl={settings.instagramUrl}
        twitterUrl={settings.twitterUrl}
      />
    </div>
  );
}
