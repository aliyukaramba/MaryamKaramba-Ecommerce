"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PackageCheck, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { confirmDelivery } from "@/actions/review";

export function ConfirmDeliveryButton({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    const result = await confirmDelivery(inquiryId);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error ?? "Something went wrong.");
      return;
    }

    toast.success("Thanks for confirming — you can now leave a review below.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <PackageCheck className="h-4 w-4" />
        Confirm Delivery
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Have you received your order?</DialogTitle>
            <DialogDescription>
              Confirming lets us close out this order and lets you leave a review for the
              products you bought.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Not yet
            </Button>
            <Button onClick={handleConfirm} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Yes, I&apos;ve received it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
