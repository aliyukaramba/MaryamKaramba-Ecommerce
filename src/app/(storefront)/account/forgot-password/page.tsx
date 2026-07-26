"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestCustomerPasswordReset } from "@/actions/customer-auth";

export default function CustomerForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await requestCustomerPasswordReset(email);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Something went wrong.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20 sm:px-6">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm">
            If an account with that email has a password set, we&apos;ve sent a reset link.
            Check your inbox.
          </p>
          <Link href="/account" className="text-sm font-medium text-accent hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-20 sm:px-6">
      <h1 className="mb-6 font-display text-2xl">Reset your password</h1>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-border bg-card p-6"
      >
        <p className="text-sm text-muted-foreground">
          Enter the email on your account and we&apos;ll send you a link to reset your password.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Sending…" : "Send reset link"}
        </Button>
        <Link href="/account" className="block text-center text-sm text-muted-foreground hover:text-foreground">
          Back to login
        </Link>
      </form>
    </div>
  );
}
