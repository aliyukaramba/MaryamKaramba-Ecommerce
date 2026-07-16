import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Edit Product" };

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { variants: true } }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Edit Product</h1>
      <ProductForm
        categories={categories}
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          barcode: product.barcode,
          brand: product.brand,
          categoryId: product.categoryId,
          description: product.description,
          shortDescription: product.shortDescription,
          price: Number(product.price),
          salePrice: product.salePrice != null ? Number(product.salePrice) : null,
          featuredImage: product.featuredImage,
          images: product.images,
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold,
          weight: product.weight,
          tags: product.tags,
          colors: product.colors,
          sizes: product.sizes,
          status: product.status,
          isFeatured: product.isFeatured,
          isTrending: product.isTrending,
          isNewArrival: product.isNewArrival,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
          seoKeywords: product.seoKeywords,
          variants: product.variants.map((v) => ({
            color: v.color,
            size: v.size,
            sku: v.sku,
            quantity: v.quantity,
            priceAdjustment: Number(v.priceAdjustment),
            image: v.image,
          })),
        }}
      />
    </div>
  );
}
