import { MessageCircle, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBusinessSettings } from "@/lib/get-business-settings";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const settings = await getBusinessSettings();
  const whatsappUrl = buildWhatsAppLink(
    settings.whatsappNumber,
    "Hello! I have a question about your products."
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="mb-6 font-display text-4xl">Get in touch</h1>
      <p className="mb-8 text-muted-foreground">
        Questions about a product, an order, or delivery? The fastest way to
        reach us is WhatsApp.
      </p>

      <div className="space-y-4">
        <Button asChild variant="whatsapp" size="lg">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-5 w-5" />
            Message us on WhatsApp
          </a>
        </Button>

        <div className="space-y-2 pt-4 text-sm">
          {settings.businessEmail && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" /> {settings.businessEmail}
            </p>
          )}
          {settings.address && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" /> {settings.address}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
