"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { subscribeToNewsletter } from "@/actions/settings";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await subscribeToNewsletter(email);
      if (result.success) {
        toast.success("Subscribed! Watch your inbox for new arrivals.");
        setEmail("");
      } else {
        toast.error(result.error ?? "Could not subscribe. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm gap-2">
      <Input
        type="email"
        required
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit" disabled={isPending} className="shrink-0">
        {isPending ? "..." : "Subscribe"}
      </Button>
    </form>
  );
}
