"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ShoppingBag, Minus, Plus } from "lucide-react";
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

export interface AddToCartVariant {
  id: string;
  color: string | null;
  size: string | null;
  quantity: number;
  priceAdjustment: number;
  sku: string;
}

export interface AddToCartProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  salePrice: number | null;
  stock: number;
  featuredImage: string;
  colors: string[];
  sizes: string[];
  variants: AddToCartVariant[];
}

export function AddToCartButton({ product }: { product: AddToCartProduct }) {
  const { addItem } = useCart();
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

  function handleAddToCart() {
    if (hasVariants && !matchedVariant) {
      toast.error("Please select a color and size.");
      return;
    }
    if (availableStock < quantity) {
      toast.error(`Only ${availableStock} unit(s) left in stock.`);
      return;
    }

    addItem({
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
    });

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

      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        disabled={product.stock <= 0}
        onClick={handleAddToCart}
      >
        <ShoppingBag className="h-5 w-5" />
        Add to Cart
      </Button>
    </div>
  );
}
