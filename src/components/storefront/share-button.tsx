"use client";

import { useEffect, useState } from "react";
import { Share2, Check, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareButton({
  title,
  text,
  url,
}: {
  title: string;
  text?: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);
  // Default to the copy-link icon so server and client render identically
  // on first paint; navigator.share is only checked after mount.
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  async function handleShare() {
    // Prefer the native share sheet where available (most mobile browsers) —
    // this is how people actually share products with friends/family.
    if (canNativeShare) {
      try {
        await navigator.share({ title, text, url });
      } catch (error) {
        // AbortError just means the user closed the share sheet — not a real error.
        if ((error as Error).name !== "AbortError") {
          console.error("Share failed:", error);
        }
      }
      return;
    }

    // Desktop fallback: copy the link.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error("Couldn't copy the link. Please copy it manually from the address bar.");
    }
  }

  return (
    <Button variant="outline" size="icon" onClick={handleShare} aria-label="Share this product">
      {copied ? (
        <Check className="h-4 w-4" />
      ) : canNativeShare ? (
        <Share2 className="h-4 w-4" />
      ) : (
        <LinkIcon className="h-4 w-4" />
      )}
    </Button>
  );
}
