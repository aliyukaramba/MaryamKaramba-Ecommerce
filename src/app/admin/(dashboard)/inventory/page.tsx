import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { StockAdjustDialog } from "@/components/admin/stock-adjust-dialog";

export const metadata = { title: "Inventory" };

export default async function AdminInventoryPage() {
  const products = await prisma.product.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { stock: "asc" },
    select: { id: true, name: true, sku: true, stock: true, lowStockThreshold: true },
  });

  const recentMovements = await prisma.inventory.findMany({
    take: 15,
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true } } },
  });

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl">Inventory</h1>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="p-4 font-medium">Product</th>
              <th className="p-4 font-medium">SKU</th>
              <th className="p-4 font-medium">Stock</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => {
              const isOut = p.stock <= 0;
              const isLow = !isOut && p.stock <= p.lowStockThreshold;
              return (
                <tr key={p.id}>
                  <td className="p-4 font-medium">{p.name}</td>
                  <td className="p-4 font-data text-muted-foreground">{p.sku}</td>
                  <td className="p-4 font-data">{p.stock}</td>
                  <td className="p-4">
                    {isOut ? (
                      <Badge variant="destructive">Out of stock</Badge>
                    ) : isLow ? (
                      <Badge variant="accent">Low stock</Badge>
                    ) : (
                      <Badge variant="default">In stock</Badge>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <StockAdjustDialog productId={p.id} productName={p.name} currentStock={p.stock} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-4 font-medium">Recent stock movements</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="p-4 font-medium">Product</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Change</th>
                <th className="p-4 font-medium">New Stock</th>
                <th className="p-4 font-medium">Reason</th>
                <th className="p-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentMovements.map((m) => (
                <tr key={m.id}>
                  <td className="p-4">{m.product.name}</td>
                  <td className="p-4"><Badge variant="outline">{m.type}</Badge></td>
                  <td className={`p-4 font-data ${m.quantity < 0 ? "text-destructive" : "text-primary"}`}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </td>
                  <td className="p-4 font-data">{m.newStock}</td>
                  <td className="p-4 text-muted-foreground">{m.reason ?? "—"}</td>
                  <td className="p-4 text-muted-foreground">{formatDate(m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentMovements.length === 0 && (
            <p className="p-10 text-center text-muted-foreground">No stock movements yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
