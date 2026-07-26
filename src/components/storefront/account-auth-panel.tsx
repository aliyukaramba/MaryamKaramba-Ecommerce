"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: "Google sign-in isn't set up yet. Please use phone and password.",
  google_auth_failed: "Google sign-in didn't complete. Please try again.",
  google_email_unverified: "Your Google account's email isn't verified. Please use phone and password.",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.12A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.61H1.27a12 12 0 0 0 0 10.78l4-3.12Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.12C6.22 6.87 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

function GoogleSignInButton({ next = "/account" }: { next?: string }) {
  return (
    <Button variant="outline" size="lg" className="w-full gap-3" asChild>
      <a href={`/api/auth/google/start?next=${encodeURIComponent(next)}`}>
        <GoogleIcon />
        Continue with Google
      </a>
    </Button>
  );
}

function useGoogleAuthErrorToast() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) {
      toast.error(GOOGLE_ERROR_MESSAGES[error] ?? "Something went wrong signing in with Google.");
      params.delete("error");
      const query = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (query ? `?${query}` : ""));
    }
  }, []);
}

type Mode = "login" | "register";

export function AccountAuthPanel() {
  const [mode, setMode] = useState<Mode>("login");
  useGoogleAuthErrorToast();

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

      <GoogleSignInButton />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or use your phone number</span>
        <div className="h-px flex-1 bg-border" />
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
      <Link
        href="/account/forgot-password"
        className="block text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Forgot your password?
      </Link>
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
        <p className="text-xs text-muted-foreground">
          At least 10 characters, with uppercase, lowercase, a number, and a special character.
        </p>
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
