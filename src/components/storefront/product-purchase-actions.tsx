"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Zap, ShoppingBag, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCart } from "@/components/storefront/cart-context";
import type { AddToCartProduct } from "@/components/storefront/add-to-cart-button";

export function ProductPurchaseActions({ product }: { product: AddToCartProduct }) {
  const router = useRouter();
  const { clearCart, addItem } = useCart();
  const [color, setColor] = useState<string | undefined>(product.colors[0]);
  const [size, setSize] = useState<string | undefined>(product.sizes[0]);
  const [quantity, setQuantity] = useState(1);

  const hasVariants = product.variants.length > 0;

  const matchedVariant = useMemo(() => {
    if (!hasVariants) return null;
    return (
      product.variants.find(
        (v) => (v.color ?? undefined) === color && (v.size ?? undefined) === size
      ) ?? null
    );
  }, [hasVariants, product.variants, color, size]);

  const unitPrice = (product.salePrice ?? product.price) + (matchedVariant?.priceAdjustment ?? 0);
  const availableStock = matchedVariant ? matchedVariant.quantity : product.stock;

  function validateSelection(): boolean {
    if (hasVariants && !matchedVariant) {
      toast.error("Please select a color and size.");
      return false;
    }
    if (availableStock < quantity) {
      toast.error(`Only ${availableStock} unit(s) left in stock.`);
      return false;
    }
    return true;
  }

  function buildCartItem() {
    return {
      productId: product.id,
      variantId: matchedVariant?.id ?? null,
      name: product.name,
      slug: product.slug,
      sku: matchedVariant?.sku ?? product.sku,
      image: product.featuredImage,
      color: color ?? null,
      size: size ?? null,
      quantity,
      unitPrice,
    };
  }

  function handleBuyNow() {
    if (!validateSelection()) return;
    // Buy Now checks out this item alone — clear anything else first.
    clearCart();
    addItem(buildCartItem());
    router.push("/checkout");
  }

  function handleAddToCart() {
    if (!validateSelection()) return;
    addItem(buildCartItem());
    toast.success(`Added ${product.name} to cart.`);
  }

  return (
    <div className="space-y-3">
      {(product.colors.length > 0 || product.sizes.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {product.colors.length > 0 && (
            <div className="space-y-1.5">
              <Label>Color</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {product.colors.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {product.sizes.length > 0 && (
            <div className="space-y-1.5">
              <Label>Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {product.sizes.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center font-data">{quantity}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setQuantity((q) => Math.min(availableStock || 1, q + 1))}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground">{availableStock} in stock</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" size="lg" disabled={product.stock <= 0} onClick={handleAddToCart}>
          <ShoppingBag className="h-5 w-5" />
          Add to Cart
        </Button>
        <Button variant="whatsapp" size="lg" disabled={product.stock <= 0} onClick={handleBuyNow}>
          <Zap className="h-5 w-5" />
          {product.stock <= 0 ? "Out of Stock" : "Buy Now"}
        </Button>
      </div>
    </div>
  );
}
