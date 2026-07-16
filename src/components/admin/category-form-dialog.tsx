"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Loader2, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCategory, updateCategory, type CategoryInput } from "@/actions/category";
import { slugify } from "@/lib/utils";

interface CategoryFormDialogProps {
  category?: { id: string; name: string; slug: string; description: string | null };
}

export function CategoryFormDialog({ category }: CategoryFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!category;

  const { register, handleSubmit, setValue, reset } = useForm<CategoryInput>({
    defaultValues: category
      ? { name: category.name, slug: category.slug, description: category.description }
      : { name: "", slug: "", description: "", order: 0, isActive: true },
  });

  async function onSubmit(values: CategoryInput) {
    setSubmitting(true);
    const result = isEdit
      ? await updateCategory(category!.id, values)
      : await createCategory(values);

    setSubmitting(false);
    if (!result.success) {
      toast.error(result.error ?? "Something went wrong.");
      return;
    }
    toast.success(isEdit ? "Category updated." : "Category created.");
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              {...register("name", {
                onChange: (e) => setValue("slug", slugify(e.target.value)),
              })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-slug">Slug</Label>
            <Input id="cat-slug" {...register("slug")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-description">Description</Label>
            <Textarea id="cat-description" rows={3} {...register("description")} />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create category"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
