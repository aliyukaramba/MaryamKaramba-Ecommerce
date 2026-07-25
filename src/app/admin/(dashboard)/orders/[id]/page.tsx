import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { OrderStatusSelect } from "@/components/admin/order-status-select";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Order Detail" };

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true, variant: true } },
    },
  });

  if (!order) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-data text-2xl">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
        </div>
        <OrderStatusSelect orderId={order.id} status={order.status} />
      </div>

      {order.status === "PAYMENT_STOCK_CONFLICT" && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Payment received — stock conflict</p>
            <p className="mt-1 text-muted-foreground">
              This customer paid successfully, but at least one item ran out of stock between
              checkout and payment confirmation. Resolve manually: restock and move to
              Processing, substitute an item, or issue a refund through Topify and mark this
              order Refunded.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 font-medium">Customer</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd>{order.fullName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="font-data">{order.phone}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{order.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Delivery city</dt>
            <dd>{order.deliveryCity}</dd>
          </div>
          {order.deliveryAddress && (
            <div className="col-span-2">
              <dt className="text-muted-foreground">Address</dt>
              <dd>{order.deliveryAddress}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 font-medium">Payment</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Provider</dt>
            <dd>{order.paymentProvider}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Reference</dt>
            <dd className="font-data">{order.paymentReference}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Provider status</dt>
            <dd>{order.providerRawStatus ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Paid at</dt>
            <dd>{order.paidAt ? formatDate(order.paidAt) : "Not yet paid"}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 font-medium">Items</h2>
        <div className="divide-y divide-border">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">{item.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {[item.color, item.size].filter(Boolean).join(" · ")}
                  {item.color || item.size ? " · " : ""}
                  Qty {item.quantity} · {item.sku}
                </p>
              </div>
              <p className="font-data">{formatCurrency(Number(item.totalPrice))}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-medium">
          <span>Total</span>
          <span className="font-data">{formatCurrency(Number(order.total))}</span>
        </div>
      </div>

      {order.notes && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-2 font-medium">Notes</h2>
          <p className="text-sm text-muted-foreground">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
