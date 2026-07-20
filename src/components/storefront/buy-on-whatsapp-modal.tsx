"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Minus, Plus, MessageCircle, LogIn, UserPlus, UserCheck } from "lucide-react";
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
import {
  loginCustomerAccount,
  registerCustomerAccount,
  getCurrentCustomerAccount,
  type CurrentCustomerAccount,
} from "@/actions/customer-auth";
import {
  customerLoginSchema,
  customerRegisterSchema,
  type CustomerLoginValues,
  type CustomerRegisterValues,
} from "@/lib/validations/customer-auth";

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

const orderFormSchema = z.object({
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

type OrderFormValues = z.infer<typeof orderFormSchema>;

type Step = "choice" | "login" | "register" | "order";

export function BuyOnWhatsAppModal({
  product,
  initialAccount,
}: {
  product: BuyOnWhatsAppProduct;
  initialAccount: CurrentCustomerAccount | null;
}) {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<CurrentCustomerAccount | null>(initialAccount);
  const [step, setStep] = useState<Step>(initialAccount ? "order" : "choice");
  const [color, setColor] = useState<string | undefined>(product.colors[0]);
  const [size, setSize] = useState<string | undefined>(product.sizes[0]);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const orderForm = useForm<OrderFormValues>({ resolver: zodResolver(orderFormSchema) });

  useEffect(() => {
    if (account) {
      orderForm.reset({
        fullName: account.fullName,
        phone: account.phone,
        email: account.email ?? "",
        deliveryCity: account.lastDeliveryCity ?? "",
        deliveryAddress: account.lastDeliveryAddress ?? "",
        notes: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

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
      setStep(account ? "order" : "choice");
    }
  }

  async function handleAuthSuccess() {
    const fresh = await getCurrentCustomerAccount();
    setAccount(fresh);
    setStep("order");
  }

  function handleContinueAsGuest() {
    orderForm.reset({
      fullName: "",
      phone: "",
      email: "",
      deliveryCity: "",
      deliveryAddress: "",
      notes: "",
    });
    setStep("order");
  }

  async function onSubmitOrder(values: OrderFormValues) {
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
          {step === "choice" && (
            <ChoiceStep
              onGuest={handleContinueAsGuest}
              onLogin={() => setStep("login")}
              onRegister={() => setStep("register")}
            />
          )}

          {step === "login" && (
            <LoginStep
              onBack={() => setStep("choice")}
              onSwitchToRegister={() => setStep("register")}
              onSuccess={handleAuthSuccess}
            />
          )}

          {step === "register" && (
            <RegisterStep
              onBack={() => setStep("choice")}
              onSwitchToLogin={() => setStep("login")}
              onSuccess={handleAuthSuccess}
            />
          )}

          {step === "order" && (
            <>
              <DialogHeader>
                <DialogTitle>Order {product.name}</DialogTitle>
                <DialogDescription>
                  {account
                    ? `Signed in as ${account.fullName}. We've filled in your saved details — feel free to adjust anything below.`
                    : "Fill in your details — we'll save your order and open WhatsApp with everything pre-filled so you can confirm with us directly."}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={orderForm.handleSubmit(onSubmitOrder)} className="space-y-4">
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
                    <Input id="fullName" {...orderForm.register("fullName")} placeholder="John Doe" />
                    {orderForm.formState.errors.fullName && (
                      <p className="text-xs text-destructive">
                        {orderForm.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" {...orderForm.register("phone")} placeholder="0801 234 5678" />
                    {orderForm.formState.errors.phone && (
                      <p className="text-xs text-destructive">
                        {orderForm.formState.errors.phone.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input id="email" type="email" {...orderForm.register("email")} placeholder="you@email.com" />
                  {orderForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {orderForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="deliveryCity">Delivery city</Label>
                    <Input id="deliveryCity" {...orderForm.register("deliveryCity")} placeholder="Lagos" />
                    {orderForm.formState.errors.deliveryCity && (
                      <p className="text-xs text-destructive">
                        {orderForm.formState.errors.deliveryCity.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="deliveryAddress">Address (optional)</Label>
                    <Input id="deliveryAddress" {...orderForm.register("deliveryAddress")} placeholder="Street, area" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea id="notes" {...orderForm.register("notes")} placeholder="Anything else we should know?" rows={2} />
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

                {!account && (
                  <button
                    type="button"
                    onClick={() => setStep("choice")}
                    className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
                  >
                    Have an account? Log in to skip retyping this next time
                  </button>
                )}
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChoiceStep({
  onGuest,
  onLogin,
  onRegister,
}: {
  onGuest: () => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>How would you like to order?</DialogTitle>
        <DialogDescription>
          Log in to skip retyping your details next time, or continue as a guest — either way your order is saved the same way.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2.5">
        <Button variant="outline" size="lg" className="w-full justify-start gap-3" onClick={onLogin}>
          <LogIn className="h-4 w-4" />
          Log in
        </Button>
        <Button variant="outline" size="lg" className="w-full justify-start gap-3" onClick={onRegister}>
          <UserPlus className="h-4 w-4" />
          Create an account
        </Button>
        <Button variant="secondary" size="lg" className="w-full justify-start gap-3" onClick={onGuest}>
          <UserCheck className="h-4 w-4" />
          Continue as guest
        </Button>
      </div>
    </>
  );
}

function LoginStep({
  onBack,
  onSwitchToRegister,
  onSuccess,
}: {
  onBack: () => void;
  onSwitchToRegister: () => void;
  onSuccess: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerLoginValues>({ resolver: zodResolver(customerLoginSchema) });

  async function onSubmit(values: CustomerLoginValues) {
    setSubmitting(true);
    const result = await loginCustomerAccount(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error ?? "Login failed. Please try again.");
      return;
    }

    toast.success("Logged in.");
    onSuccess();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Log in</DialogTitle>
        <DialogDescription>Use the phone number and password from your account.</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="login-phone">Phone number</Label>
          <Input id="login-phone" {...register("phone")} placeholder="0801 234 5678" />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="login-password">Password</Label>
          <Input id="login-password" type="password" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Logging in…" : "Log in"}
        </Button>

        <div className="flex items-center justify-between text-xs">
          <button type="button" onClick={onBack} className="text-muted-foreground hover:text-foreground">
            ← Back
          </button>
          <button type="button" onClick={onSwitchToRegister} className="text-accent hover:underline">
            Need an account? Register
          </button>
        </div>
      </form>
    </>
  );
}

function RegisterStep({
  onBack,
  onSwitchToLogin,
  onSuccess,
}: {
  onBack: () => void;
  onSwitchToLogin: () => void;
  onSuccess: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerRegisterValues>({ resolver: zodResolver(customerRegisterSchema) });

  async function onSubmit(values: CustomerRegisterValues) {
    setSubmitting(true);
    const result = await registerCustomerAccount(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error ?? "Registration failed. Please try again.");
      return;
    }

    toast.success("Account created.");
    onSuccess();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create an account</DialogTitle>
        <DialogDescription>
          Save your details so future orders are faster — no need to retype your name and phone every time.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="register-name">Full name</Label>
          <Input id="register-name" {...register("fullName")} placeholder="John Doe" />
          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="register-phone">Phone number</Label>
          <Input id="register-phone" {...register("phone")} placeholder="0801 234 5678" />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="register-email">Email (optional)</Label>
          <Input id="register-email" type="email" {...register("email")} placeholder="you@email.com" />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="register-password">Password</Label>
          <Input id="register-password" type="password" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Creating account…" : "Create account"}
        </Button>

        <div className="flex items-center justify-between text-xs">
          <button type="button" onClick={onBack} className="text-muted-foreground hover:text-foreground">
            ← Back
          </button>
          <button type="button" onClick={onSwitchToLogin} className="text-accent hover:underline">
            Already have an account? Log in
          </button>
        </div>
      </form>
    </>
  );
}
