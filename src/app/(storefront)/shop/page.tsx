import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { ProductCard } from "@/components/storefront/product-card";
import { ShopFilters } from "@/components/storefront/shop-filters";
import { Input } from "@/components/ui/input";

export const metadata = {
  title: "Shop",
  description: "Browse the full catalog and order instantly on WhatsApp.",
};

interface ShopPageProps {
  searchParams: Promise<{
    category?: string;
    availability?: string;
    tag?: string;
    sort?: string;
    q?: string;
  }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  const where: Prisma.ProductWhereInput = { status: "PUBLISHED" };

  if (params.category) {
    where.category = { slug: params.category };
  }
  if (params.availability === "in-stock") {
    where.stock = { gt: 0 };
  } else if (params.availability === "out-of-stock") {
    where.stock = { lte: 0 };
  }
  if (params.tag === "featured") where.isFeatured = true;
  if (params.tag === "trending") where.isTrending = true;
  if (params.tag === "new") where.isNewArrival = true;
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { sku: { contains: params.q, mode: "insensitive" } },
      { tags: { has: params.q.toLowerCase() } },
    ];
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    params.sort === "oldest"
      ? { createdAt: "asc" }
      : params.sort === "price-asc"
      ? { price: "asc" }
      : params.sort === "price-desc"
      ? { price: "desc" }
      : { createdAt: "desc" };

  const products = await prisma.product.findMany({ where, orderBy, take: 60 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-4">
        <h1 className="font-display text-4xl">Shop</h1>
        <form className="max-w-md">
          <Input
            type="search"
            name="q"
            defaultValue={params.q}
            placeholder="Search products, SKU, or tags…"
          />
        </form>
      </div>

      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <aside className="md:sticky md:top-24 md:h-fit">
          <Suspense fallback={null}>
            <ShopFilters categories={categories} />
          </Suspense>
        </aside>

        <div>
          {products.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={{
                    ...p,
                    price: Number(p.price),
                    salePrice: p.salePrice != null ? Number(p.salePrice) : null,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
      <h3 className="font-display text-xl">No products match those filters</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Try a different category, or clear your filters to see the full catalog.
      </p>
    </div>
  );
}
