import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { CategoryFormDialog } from "@/components/admin/category-form-dialog";
import { CategoryDeleteButton } from "@/components/admin/category-delete-button";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Categories</h1>
        <CategoryFormDialog />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Slug</th>
              <th className="p-4 font-medium">Products</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="p-4 font-medium">{c.name}</td>
                <td className="p-4 font-data text-muted-foreground">{c.slug}</td>
                <td className="p-4">{c._count.products}</td>
                <td className="p-4">
                  <Badge variant={c.isActive ? "default" : "outline"}>
                    {c.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-1">
                    <CategoryFormDialog category={c} />
                    <CategoryDeleteButton categoryId={c.id} productCount={c._count.products} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 && (
          <p className="p-10 text-center text-muted-foreground">No categories yet.</p>
        )}
      </div>
    </div>
  );
}
