"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { productSchema, type ProductFormValues } from "@/lib/validations/product";
import { createProduct, updateProduct } from "@/actions/product";
import { slugify } from "@/lib/utils";
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
import { ImageUploader } from "@/components/admin/image-uploader";
import { TagInput } from "@/components/admin/tag-input";

interface ProductFormProps {
  categories: { id: string; name: string }[];
  product?: (ProductFormValues & { id: string }) | null;
}

export function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!product;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ?? {
      name: "",
      slug: "",
      sku: "",
      categoryId: "",
      description: "",
      price: 0,
      featuredImage: "",
      images: [],
      stock: 0,
      lowStockThreshold: 5,
      tags: [],
      colors: [],
      sizes: [],
      status: "DRAFT",
      isFeatured: false,
      isTrending: false,
      isNewArrival: true,
      seoKeywords: [],
      variants: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });

  const images = watch("images");
  const featuredImage = watch("featuredImage");
  const name = watch("name");

  async function onSubmit(values: ProductFormValues) {
    setSubmitting(true);
    try {
      const result = isEdit
        ? await updateProduct(product!.id, values)
        : await createProduct(values);

      if (!result.success) {
        toast.error(result.error ?? "Something went wrong.");
        setSubmitting(false);
        return;
      }

      toast.success(isEdit ? "Product updated." : "Product created.");
      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-16">
      {/* ---- Basic info ---- */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-medium">Basic information</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Product name</Label>
            <Input
              id="name"
              {...register("name", {
                onChange: (e) => {
                  if (!isEdit) setValue("slug", slugify(e.target.value));
                },
              })}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" {...register("slug")} />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...register("sku")} />
            {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="barcode">Barcode (optional)</Label>
            <Input id="barcode" {...register("barcode")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" {...register("brand")} />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && (
              <p className="text-xs text-destructive">{errors.categoryId.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="shortDescription">Short description</Label>
          <Input id="shortDescription" {...register("shortDescription")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Full description</Label>
          <Textarea id="description" rows={5} {...register("description")} />
          {errors.description && (
            <p className="text-xs text-destructive">{errors.description.message}</p>
          )}
        </div>
      </section>

      {/* ---- Pricing & stock ---- */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-medium">Pricing & stock</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="price">Price</Label>
            <Input id="price" type="number" step="0.01" {...register("price", { valueAsNumber: true })} />
            {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="salePrice">Sale price</Label>
            <Input id="salePrice" type="number" step="0.01" {...register("salePrice", { valueAsNumber: true })} />
            {errors.salePrice && <p className="text-xs text-destructive">{errors.salePrice.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stock">Stock</Label>
            <Input id="stock" type="number" {...register("stock", { valueAsNumber: true })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lowStockThreshold">Low stock threshold</Label>
            <Input id="lowStockThreshold" type="number" {...register("lowStockThreshold", { valueAsNumber: true })} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="weight">Weight (kg, optional)</Label>
            <Input id="weight" type="number" step="0.01" {...register("weight", { valueAsNumber: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-1">
          {(["isFeatured", "isTrending", "isNewArrival"] as const).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register(key)} className="h-4 w-4 rounded border-input" />
              {key === "isFeatured" ? "Featured" : key === "isTrending" ? "Trending" : "New arrival"}
            </label>
          ))}
        </div>
      </section>

      {/* ---- Images ---- */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-medium">Images</h2>
        <ImageUploader
          images={images}
          onChange={(imgs) => setValue("images", imgs)}
          featuredImage={featuredImage}
          onFeaturedChange={(url) => setValue("featuredImage", url)}
        />
        {errors.featuredImage && (
          <p className="text-xs text-destructive">Upload at least one image and mark it featured.</p>
        )}
      </section>

      {/* ---- Attributes ---- */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-medium">Attributes</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Available colors</Label>
            <Controller
              control={control}
              name="colors"
              render={({ field }) => (
                <TagInput values={field.value} onChange={field.onChange} placeholder="e.g. Black" />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Available sizes</Label>
            <Controller
              control={control}
              name="sizes"
              render={({ field }) => (
                <TagInput values={field.value} onChange={field.onChange} placeholder="e.g. 42" />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <TagInput values={field.value} onChange={field.onChange} placeholder="e.g. sneakers" />
              )}
            />
          </div>
        </div>
      </section>

      {/* ---- Variants ---- */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Variants</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              append({ color: "", size: "", sku: "", quantity: 0, priceAdjustment: 0, image: "" })
            }
          >
            <Plus className="h-4 w-4" /> Add variant
          </Button>
        </div>

        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No variants yet — the product will use the base price and stock above.
          </p>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 sm:grid-cols-6">
                <Input placeholder="Color" {...register(`variants.${index}.color`)} />
                <Input placeholder="Size" {...register(`variants.${index}.size`)} />
                <Input placeholder="SKU" {...register(`variants.${index}.sku`)} />
                <Input
                  type="number"
                  placeholder="Qty"
                  {...register(`variants.${index}.quantity`, { valueAsNumber: true })}
                />
                <Input
                  type="number"
                  placeholder="+/- Price"
                  {...register(`variants.${index}.priceAdjustment`, { valueAsNumber: true })}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- SEO ---- */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-medium">SEO</h2>
        <div className="space-y-1.5">
          <Label htmlFor="seoTitle">SEO title</Label>
          <Input id="seoTitle" {...register("seoTitle")} placeholder={name || "Defaults to product name"} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="seoDescription">SEO description</Label>
          <Textarea id="seoDescription" rows={2} {...register("seoDescription")} />
        </div>
        <div className="space-y-1.5">
          <Label>Keywords</Label>
          <Controller
            control={control}
            name="seoKeywords"
            render={({ field }) => (
              <TagInput values={field.value} onChange={field.onChange} placeholder="e.g. running shoes" />
            )}
          />
        </div>
      </section>

      <div className="sticky bottom-4 flex justify-end gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
