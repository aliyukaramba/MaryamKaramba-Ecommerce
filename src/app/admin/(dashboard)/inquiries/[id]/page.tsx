import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { getBusinessSettings } from "@/lib/get-business-settings";
import { Button } from "@/components/ui/button";
import { InquiryStatusSelect } from "@/components/admin/inquiry-status-select";

interface InquiryDetailPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Inquiry Detail" };

export default async function InquiryDetailPage({ params }: InquiryDetailPageProps) {
  const { id } = await params;

  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true, variant: true } },
    },
  });

  if (!inquiry) notFound();

  const settings = await getBusinessSettings();
  const whatsappUrl = buildWhatsAppLink(
    inquiry.customer.phone,
    `Hello ${inquiry.customer.fullName}, this is ${settings.businessName} regarding your order ${inquiry.inquiryNumber}.`
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-data text-2xl">{inquiry.inquiryNumber}</h1>
          <p className="text-sm text-muted-foreground">{formatDate(inquiry.createdAt)}</p>
        </div>
        <InquiryStatusSelect inquiryId={inquiry.id} status={inquiry.status} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 font-medium">Customer</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd>{inquiry.customer.fullName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="font-data">{inquiry.customer.phone}</dd>
          </div>
          {inquiry.customer.email && (
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{inquiry.customer.email}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Delivery city</dt>
            <dd>{inquiry.customer.deliveryCity}</dd>
          </div>
          {inquiry.customer.deliveryAddress && (
            <div className="col-span-2">
              <dt className="text-muted-foreground">Address</dt>
              <dd>{inquiry.customer.deliveryAddress}</dd>
            </div>
          )}
        </dl>
        <Button asChild variant="whatsapp" className="mt-4">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" /> Message on WhatsApp
          </a>
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 font-medium">Items</h2>
        <div className="divide-y divide-border">
          {inquiry.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">{item.product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[item.color, item.size].filter(Boolean).join(" · ")}
                  {item.color || item.size ? " · " : ""}
                  Qty {item.quantity} · {item.variant?.sku ?? item.product.sku}
                </p>
              </div>
              <p className="font-data">{formatCurrency(Number(item.totalPrice))}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-border pt-3 font-medium">
          <span>Total</span>
          <span className="font-data">{formatCurrency(Number(inquiry.totalAmount))}</span>
        </div>
      </div>

      {inquiry.notes && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-2 font-medium">Notes</h2>
          <p className="text-sm text-muted-foreground">{inquiry.notes}</p>
        </div>
      )}
    </div>
  );
}
