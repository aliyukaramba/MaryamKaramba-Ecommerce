import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProductRowActions } from "@/components/admin/product-row-actions";

export const metadata = { title: "Products" };

interface ProductsPageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;

  const products = await prisma.product.findMany({
    where: {
      ...(params.status ? { status: params.status as "DRAFT" | "PUBLISHED" | "ARCHIVED" } : {}),
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: "insensitive" } },
              { sku: { contains: params.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { category: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Products</h1>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" /> Add Product
          </Link>
        </Button>
      </div>

      <form className="max-w-sm">
        <Input name="q" defaultValue={params.q} placeholder="Search by name or SKU…" />
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="p-4 font-medium">Product</th>
              <th className="p-4 font-medium">Category</th>
              <th className="p-4 font-medium">Price</th>
              <th className="p-4 font-medium">Stock</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="p-4">
                  <Link href={`/admin/products/${p.id}/edit`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  <p className="font-data text-xs text-muted-foreground">{p.sku}</p>
                </td>
                <td className="p-4 text-muted-foreground">{p.category.name}</td>
                <td className="p-4 font-data">
                  {formatCurrency(Number(p.salePrice ?? p.price))}
                </td>
                <td className="p-4">
                  <span className={p.stock <= p.lowStockThreshold ? "text-destructive" : ""}>
                    {p.stock}
                  </span>
                </td>
                <td className="p-4">
                  <Badge
                    variant={
                      p.status === "PUBLISHED"
                        ? "default"
                        : p.status === "DRAFT"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {p.status}
                  </Badge>
                </td>
                <td className="p-4">
                  <ProductRowActions productId={p.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <p className="p-10 text-center text-muted-foreground">No products found.</p>
        )}
      </div>
    </div>
  );
}
