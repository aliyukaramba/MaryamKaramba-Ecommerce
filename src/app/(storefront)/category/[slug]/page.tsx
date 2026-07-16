import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/storefront/product-card";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return { title: "Category not found" };

  return {
    title: category.seoTitle || category.name,
    description: category.seoDescription || category.description || undefined,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug, isActive: true } });
  if (!category) notFound();

  const products = await prisma.product.findMany({
    where: { categoryId: category.id, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl">{category.name}</h1>
      {category.description && (
        <p className="mt-2 max-w-xl text-muted-foreground">{category.description}</p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
        {products.length === 0 ? (
          <p className="col-span-full py-16 text-center text-muted-foreground">
            No products in this category yet — check back soon.
          </p>
        ) : (
          products.map((p) => (
            <ProductCard
              key={p.id}
              product={{
                ...p,
                price: Number(p.price),
                salePrice: p.salePrice != null ? Number(p.salePrice) : null,
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
