"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Minus, Plus, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { createInquiry } from "@/actions/inquiry";
import { incrementProductClick } from "@/actions/product";

export interface BuyProductVariant {
  id: string;
  color: string | null;
  size: string | null;
  quantity: number;
  priceAdjustment: number;
  sku: string;
}

export interface BuyOnWhatsAppProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  salePrice: number | null;
  stock: number;
  colors: string[];
  sizes: string[];
  variants: BuyProductVariant[];
}

const formSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .regex(/^[\d+\s()-]+$/, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  deliveryCity: z.string().min(2, "Delivery city is required"),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function BuyOnWhatsAppModal({ product }: { product: BuyOnWhatsAppProduct }) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState<string | undefined>(product.colors[0]);
  const [size, setSize] = useState<string | undefined>(product.sizes[0]);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  const hasVariants = product.variants.length > 0;

  const matchedVariant = useMemo(() => {
    if (!hasVariants) return null;
    return (
      product.variants.find(
        (v) =>
          (v.color ?? undefined) === color && (v.size ?? undefined) === size
      ) ?? null
    );
  }, [hasVariants, product.variants, color, size]);

  const unitPrice = useMemo(() => {
    const base = product.salePrice ?? product.price;
    return base + (matchedVariant?.priceAdjustment ?? 0);
  }, [product.salePrice, product.price, matchedVariant]);

  const availableStock = matchedVariant ? matchedVariant.quantity : product.stock;
  const total = unitPrice * quantity;

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      await incrementProductClick(product.id);
    }
  }

  async function onSubmit(values: FormValues) {
    if (hasVariants && !matchedVariant) {
      toast.error("Please select a color and size.");
      return;
    }
    if (availableStock < quantity) {
      toast.error(`Only ${availableStock} unit(s) left in stock.`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await createInquiry({
        fullName: values.fullName,
        phone: values.phone,
        email: values.email || null,
        deliveryCity: values.deliveryCity,
        deliveryAddress: values.deliveryAddress || null,
        notes: values.notes || null,
        items: [
          {
            productId: product.id,
            variantId: matchedVariant?.id ?? null,
            color: color ?? null,
            size: size ?? null,
            quantity,
          },
        ],
      });

      if (!result.success) {
        toast.error(result.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      toast.success(`Order ${result.inquiryNumber} saved — opening WhatsApp…`);
      reset();
      setOpen(false);

      if (result.whatsappUrl) {
        window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        variant="whatsapp"
        size="lg"
        className="w-full"
        disabled={product.stock <= 0}
        onClick={() => handleOpenChange(true)}
      >
        <MessageCircle className="h-5 w-5" />
        {product.stock <= 0 ? "Out of Stock" : "Buy on WhatsApp"}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order {product.name}</DialogTitle>
            <DialogDescription>
              Fill in your details — we&apos;ll save your order and open WhatsApp
              with everything pre-filled so you can confirm with us directly.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-data">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setQuantity((q) => Math.min(availableStock || 1, q + 1))
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {availableStock} in stock
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" {...register("fullName")} placeholder="John Doe" />
                {errors.fullName && (
                  <p className="text-xs text-destructive">{errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register("phone")} placeholder="0801 234 5678" />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" type="email" {...register("email")} placeholder="you@email.com" />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="deliveryCity">Delivery city</Label>
                <Input id="deliveryCity" {...register("deliveryCity")} placeholder="Lagos" />
                {errors.deliveryCity && (
                  <p className="text-xs text-destructive">{errors.deliveryCity.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deliveryAddress">Address (optional)</Label>
                <Input id="deliveryAddress" {...register("deliveryAddress")} placeholder="Street, area" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" {...register("notes")} placeholder="Anything else we should know?" rows={2} />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-data text-lg font-semibold">
                {formatCurrency(total)}
              </span>
            </div>

            <Button type="submit" variant="whatsapp" size="lg" className="w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <MessageCircle className="h-5 w-5" />
              )}
              {submitting ? "Saving order…" : "Confirm & Open WhatsApp"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
