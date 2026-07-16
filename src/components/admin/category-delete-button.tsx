"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteCategory } from "@/actions/category";

export function CategoryDeleteButton({
  categoryId,
  productCount,
}: {
  categoryId: string;
  productCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (productCount > 0) {
      toast.error(`Cannot delete: ${productCount} product(s) still reference this category.`);
      return;
    }
    if (!confirm("Delete this category?")) return;

    startTransition(async () => {
      const result = await deleteCategory(categoryId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete category.");
        return;
      }
      toast.success("Category deleted.");
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isPending}>
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
