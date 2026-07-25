import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import type { OrderStatus } from "@prisma/client";

export const metadata = { title: "Orders" };

interface OrdersPageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;

  const orders = await prisma.order.findMany({
    where: {
      ...(params.status ? { status: params.status as OrderStatus } : {}),
      ...(params.q
        ? {
            OR: [
              { orderNumber: { contains: params.q, mode: "insensitive" } },
              { paymentReference: { contains: params.q, mode: "insensitive" } },
              { fullName: { contains: params.q, mode: "insensitive" } },
              { phone: { contains: params.q } },
              { email: { contains: params.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Orders</h1>
      </div>

      <form className="max-w-sm">
        <Input
          name="q"
          defaultValue={params.q}
          placeholder="Search by order #, reference, name, or phone…"
        />
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="p-4 font-medium">Order #</th>
              <th className="p-4 font-medium">Customer</th>
              <th className="p-4 font-medium">Phone</th>
              <th className="p-4 font-medium">Items</th>
              <th className="p-4 font-medium">Total</th>
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="p-4">
                  <Link href={`/admin/orders/${order.id}`} className="font-data hover:underline">
                    {order.orderNumber}
                  </Link>
                  {order.status === "PAYMENT_STOCK_CONFLICT" && (
                    <Badge variant="destructive" className="ml-2">
                      Needs review
                    </Badge>
                  )}
                </td>
                <td className="p-4">{order.fullName}</td>
                <td className="p-4 font-data text-muted-foreground">{order.phone}</td>
                <td className="p-4">{order.items.length}</td>
                <td className="p-4 font-data">{formatCurrency(Number(order.total))}</td>
                <td className="p-4 text-muted-foreground">{formatDate(order.createdAt)}</td>
                <td className="p-4">
                  <OrderStatusSelect orderId={order.id} status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="p-10 text-center text-muted-foreground">No orders found.</p>
        )}
      </div>
    </div>
  );
}
