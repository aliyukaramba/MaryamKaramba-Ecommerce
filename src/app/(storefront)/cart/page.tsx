"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, X, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/components/storefront/cart-context";

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="font-display text-2xl">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">
          Browse the shop and add something you like.
        </p>
        <Button asChild className="mt-6">
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 font-display text-3xl">Your Cart</h1>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variantId ?? "base"}`}
            className="flex gap-4 rounded-2xl border border-border bg-card p-4"
          >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
              <Image src={item.image} alt={item.name} fill className="object-cover" />
            </div>

            <div className="flex flex-1 flex-col justify-between">
              <div>
                <Link
                  href={`/product/${item.slug}`}
                  className="font-display text-base hover:underline"
                >
                  {item.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {item.color ? `${item.color}` : ""}
                  {item.size ? ` / ${item.size}` : ""}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-6 text-center font-data text-sm">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <span className="font-data text-sm font-semibold">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </div>
            </div>

            <button
              onClick={() => removeItem(item.productId, item.variantId)}
              className="self-start text-muted-foreground hover:text-destructive"
              aria-label="Remove item"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between rounded-2xl bg-secondary px-5 py-4">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <span className="font-data text-xl font-semibold">{formatCurrency(subtotal)}</span>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Final total is confirmed at checkout — prices are re-verified against current stock and pricing.
      </p>

      <Button asChild size="lg" className="mt-6 w-full">
        <Link href="/checkout">Proceed to Checkout</Link>
      </Button>
    </div>
  );
}
