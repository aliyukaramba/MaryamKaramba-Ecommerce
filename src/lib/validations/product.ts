import { z } from "zod";

export const productVariantSchema = z.object({
  color: z.string().max(50).optional().nullable(),
  size: z.string().max(50).optional().nullable(),
  sku: z.string().min(1, "Variant SKU is required").max(100),
  quantity: z.number().int().min(0).default(0),
  priceAdjustment: z.number().default(0),
  image: z.string().url().optional().nullable(),
});

export const productSchema = z.object({
  name: z.string().min(2, "Product name is required").max(200),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase, letters, numbers, hyphens only"),
  sku: z.string().min(1, "SKU is required").max(100),
  barcode: z.string().max(100).optional().nullable(),
  brand: z.string().max(100).optional().nullable(),
  categoryId: z.string().cuid("Select a valid category"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  shortDescription: z.string().max(300).optional().nullable(),
  price: z.number().positive("Price must be greater than 0"),
  salePrice: z.number().positive().optional().nullable(),
  featuredImage: z.string().url("Featured image is required"),
  images: z.array(z.string().url()).default([]),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  weight: z.number().positive().optional().nullable(),
  tags: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  isFeatured: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isNewArrival: z.boolean().default(true),
  seoTitle: z.string().max(70).optional().nullable(),
  seoDescription: z.string().max(160).optional().nullable(),
  seoKeywords: z.array(z.string()).default([]),
  variants: z.array(productVariantSchema).default([]),
}).refine(
  (data) => !data.salePrice || data.salePrice < data.price,
  { message: "Sale price must be lower than regular price", path: ["salePrice"] }
);

export type ProductFormValues = z.infer<typeof productSchema>;
