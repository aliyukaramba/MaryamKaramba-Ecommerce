"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/actions/product";

export function ProductRowActions({ productId }: { productId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this product? Products with order history will be archived instead.")) {
      return;
    }
    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete product.");
        return;
      }
      toast.success(result.archived ? "Product archived." : "Product deleted.");
      router.refresh();
    });
  }

  return (
    <div className="flex justify-end gap-1">
      <Button asChild variant="ghost" size="icon">
        <Link href={`/admin/products/${productId}/edit`}>
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>
      <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isPending}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
