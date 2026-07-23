"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, MessageCircle, User, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/storefront/cart-context";

const navLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/category", label: "Categories" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader({
  businessName,
  logo,
}: {
  businessName: string;
  logo?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="chat-tail flex items-center gap-2 font-display text-xl">
          {logo ? (
            <span className="relative block h-9 w-32">
              <Image
                src={logo}
                alt={businessName}
                fill
                className="object-contain object-left"
                priority
              />
            </span>
          ) : (
            <>
              <MessageCircle className="h-5 w-5 text-accent" />
              {businessName}
            </>
          )}
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-foreground/80 transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/account"
            className="rounded-full p-2 text-foreground/80 hover:bg-secondary hover:text-foreground"
            aria-label="My account"
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            href="/cart"
            className="relative rounded-full p-2 text-foreground/80 hover:bg-secondary hover:text-foreground"
            aria-label="Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-data text-[10px] text-accent-foreground">
                {itemCount}
              </span>
            )}
          </Link>
          <Button asChild size="sm">
            <Link href="/shop">Shop Now</Link>
          </Button>
        </div>

        <button
          className="p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-border bg-background px-4 py-3 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-secondary"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/account"
            className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-secondary"
            onClick={() => setOpen(false)}
          >
            My Account
          </Link>
          <Link
            href="/cart"
            className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-secondary"
            onClick={() => setOpen(false)}
          >
            Cart{itemCount > 0 ? ` (${itemCount})` : ""}
          </Link>
        </nav>
      )}
    </header>
  );
}
