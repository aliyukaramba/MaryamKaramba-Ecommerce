import Link from "next/link";
import Image from "next/image";
import { NewsletterForm } from "@/components/storefront/newsletter-form";

interface SiteFooterProps {
  businessName: string;
  logo?: string | null;
  address?: string | null;
  businessEmail?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
}

export function SiteFooter({
  businessName,
  logo,
  address,
  businessEmail,
  facebookUrl,
  instagramUrl,
  twitterUrl,
}: SiteFooterProps) {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="space-y-3 md:col-span-2">
          {logo ? (
            <span className="relative block h-10 w-36">
              <Image src={logo} alt={businessName} fill className="object-contain object-left" />
            </span>
          ) : (
            <h3 className="font-display text-xl">{businessName}</h3>
          )}
          <p className="max-w-sm text-sm text-muted-foreground">
            Browse the catalog, pick what you like, and finish the order in a
            WhatsApp chat — no cart, no checkout page, just a conversation.
          </p>
          <NewsletterForm />
        </div>

        <div className="space-y-2 text-sm">
          <h4 className="font-medium">Explore</h4>
          <ul className="space-y-1.5 text-muted-foreground">
            <li><Link href="/shop" className="hover:text-foreground">Shop</Link></li>
            <li><Link href="/category" className="hover:text-foreground">Categories</Link></li>
            <li><Link href="/about" className="hover:text-foreground">About</Link></li>
            <li><Link href="/faq" className="hover:text-foreground">FAQ</Link></li>
          </ul>
        </div>

        <div className="space-y-2 text-sm">
          <h4 className="font-medium">Contact</h4>
          <ul className="space-y-1.5 text-muted-foreground">
            {address && <li>{address}</li>}
            {businessEmail && <li>{businessEmail}</li>}
            <li className="flex gap-3 pt-1">
              {facebookUrl && <a href={facebookUrl} className="hover:text-foreground">Facebook</a>}
              {instagramUrl && <a href={instagramUrl} className="hover:text-foreground">Instagram</a>}
              {twitterUrl && <a href={twitterUrl} className="hover:text-foreground">Twitter</a>}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} {businessName}. All rights reserved.
      </div>
    </footer>
  );
}
