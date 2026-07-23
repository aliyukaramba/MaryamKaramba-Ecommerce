"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/components/storefront/cart-context";
import { initiateOrder, confirmOrderPayment } from "@/actions/order";
import { getCurrentCustomerAccount } from "@/actions/customer-auth";

declare global {
  interface Window {
    TopifyPop?: {
      setup: (config: {
        key: string;
        email: string;
        amount: number;
        reference: string;
        onSuccess: (transaction: { reference: string }) => void;
        onClose: () => void;
      }) => { openIframe: () => void };
    };
  }
}

const checkoutFormSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .regex(/^[\d+\s()-]+$/, "Enter a valid phone number"),
  email: z.string().email("A valid email is required for payment"),
  deliveryCity: z.string().min(2, "Delivery city is required"),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CheckoutFormValues>({ resolver: zodResolver(checkoutFormSchema) });

  useEffect(() => {
    getCurrentCustomerAccount().then((account) => {
      if (account) {
        reset({
          fullName: account.fullName,
          phone: account.phone,
          email: account.email ?? "",
          deliveryCity: account.lastDeliveryCity ?? "",
          deliveryAddress: account.lastDeliveryAddress ?? "",
          notes: "",
        });
      }
    });
  }, [reset]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-2xl">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Add something to your cart before checking out.</p>
      </div>
    );
  }

  async function onSubmit(values: CheckoutFormValues) {
    if (!scriptLoaded || !window.TopifyPop) {
      toast.error("Payment is still loading. Please try again in a moment.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await initiateOrder({
        fullName: values.fullName,
        phone: values.phone,
        email: values.email,
        deliveryCity: values.deliveryCity,
        deliveryAddress: values.deliveryAddress || null,
        notes: values.notes || null,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          color: i.color,
          size: i.size,
        })),
      });

      if (!result.success || !result.reference || !result.amountKobo) {
        toast.error(result.error ?? "Could not start checkout. Please try again.");
        setSubmitting(false);
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_TOPIFY_PUBLIC_KEY;
      if (!publicKey) {
        toast.error("Payment is not configured yet. Please contact support.");
        setSubmitting(false);
        return;
      }

      const handler = window.TopifyPop.setup({
        key: publicKey,
        email: result.email!,
        amount: result.amountKobo,
        reference: result.reference,
        onSuccess: async (transaction) => {
          const confirmation = await confirmOrderPayment(transaction.reference);
          setSubmitting(false);
          if (confirmation.success) {
            clearCart();
            toast.success("Payment confirmed!");
            router.push(`/order/${transaction.reference}`);
          } else {
            toast.error(
              "We received your payment but couldn't confirm it automatically — our team will verify it shortly."
            );
            router.push(`/order/${transaction.reference}`);
          }
        },
        onClose: () => {
          setSubmitting(false);
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Script
        src="https://js.topify.ng/inline.js"
        onLoad={() => setScriptLoaded(true)}
        strategy="afterInteractive"
      />

      <h1 className="mb-8 font-display text-3xl">Checkout</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" {...register("fullName")} placeholder="John Doe" />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} placeholder="0801 234 5678" />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} placeholder="you@email.com" />
          <p className="text-xs text-muted-foreground">Required — your payment receipt goes here.</p>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
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
          <Textarea id="notes" {...register("notes")} rows={2} />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-data text-lg font-semibold">{formatCurrency(subtotal)}</span>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={submitting || !scriptLoaded}>
          {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
          {!scriptLoaded ? "Loading payment…" : submitting ? "Processing…" : "Pay Now"}
        </Button>
      </form>
    </div>
  );
}
