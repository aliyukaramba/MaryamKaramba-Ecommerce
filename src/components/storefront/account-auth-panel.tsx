"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginCustomerAccount, registerCustomerAccount } from "@/actions/customer-auth";
import {
  customerLoginSchema,
  customerRegisterSchema,
  type CustomerLoginValues,
  type CustomerRegisterValues,
} from "@/lib/validations/customer-auth";

type Mode = "login" | "register";

export function AccountAuthPanel() {
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="font-display text-3xl">
          {mode === "login" ? "Log in" : "Create an account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "login"
            ? "See your past orders and skip retyping your details next time."
            : "Save your details so future orders are faster."}
        </p>
      </div>

      {mode === "login" ? <LoginForm /> : <RegisterForm />}

      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        className="block text-center text-sm text-accent hover:underline w-full"
      >
        {mode === "login" ? "Need an account? Register" : "Already have an account? Log in"}
      </button>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
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
    router.refresh();
  }

  return (
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
    </form>
  );
}

function RegisterForm() {
  const router = useRouter();
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
    router.refresh();
  }

  return (
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
    </form>
  );
}
