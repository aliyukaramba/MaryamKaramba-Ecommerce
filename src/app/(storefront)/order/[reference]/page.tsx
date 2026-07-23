import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getOrderByReference } from "@/actions/order";

export const dynamic = "force-dynamic";

interface OrderPageProps {
  params: Promise<{ reference: string }>;
}

export default async function OrderConfirmationPage({ params }: OrderPageProps) {
  const { reference } = await params;
  const order = await getOrderByReference(reference);

  if (!order) notFound();

  const statusDisplay = {
    PENDING_PAYMENT: { icon: Clock, label: "Awaiting payment confirmation", tone: "text-muted-foreground" },
    PAID: { icon: CheckCircle2, label: "Payment confirmed", tone: "text-primary" },
    PROCESSING: { icon: CheckCircle2, label: "Processing your order", tone: "text-primary" },
    SHIPPED: { icon: CheckCircle2, label: "Shipped", tone: "text-primary" },
    DELIVERED: { icon: CheckCircle2, label: "Delivered", tone: "text-primary" },
    CANCELLED: { icon: AlertTriangle, label: "Cancelled", tone: "text-destructive" },
    REFUNDED: { icon: AlertTriangle, label: "Refunded", tone: "text-destructive" },
    PAYMENT_STOCK_CONFLICT: {
      icon: AlertTriangle,
      label: "Payment received — our team is confirming stock and will reach out shortly",
      tone: "text-accent",
    },
  }[order.status];

  const StatusIcon = statusDisplay.icon;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <StatusIcon className={`mx-auto mb-3 h-12 w-12 ${statusDisplay.tone}`} />
        <h1 className="font-display text-3xl">{statusDisplay.label}</h1>
        <p className="mt-2 font-data text-sm text-muted-foreground">{order.orderNumber}</p>
        <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <ul className="space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <span>
                {item.productName}
                {item.color ? ` — ${item.color}` : ""}
                {item.size ? ` / ${item.size}` : ""} × {item.quantity}
              </span>
              <span className="font-data text-muted-foreground">
                {formatCurrency(Number(item.totalPrice))}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="font-medium">Total</span>
          <span className="font-data text-lg font-semibold">
            {formatCurrency(Number(order.total))}
          </span>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        A receipt has been sent to {order.email}. We&apos;ll be in touch about delivery to{" "}
        {order.deliveryCity}.
      </p>

      <div className="mt-8 flex justify-center">
        <Button asChild>
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
