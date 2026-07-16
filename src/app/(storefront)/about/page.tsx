import { getBusinessSettings } from "@/lib/get-business-settings";

export const metadata = { title: "About" };

export default async function AboutPage() {
  const settings = await getBusinessSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="mb-6 font-display text-4xl">About {settings.businessName}</h1>
      <div className="space-y-4 text-muted-foreground">
        <p>
          We built {settings.businessName} around a simple idea: shopping should
          feel like talking to someone you trust, not filling out a checkout form.
        </p>
        <p>
          Browse the catalog, pick what you want, and finish the conversation on
          WhatsApp — where you can ask questions, confirm details, and arrange
          delivery directly with our team.
        </p>
        {settings.address && <p>You can find us at {settings.address}.</p>}
      </div>
    </div>
  );
}
