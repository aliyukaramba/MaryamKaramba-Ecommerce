import Link from "next/link";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InquiryStatusSelect } from "@/components/admin/inquiry-status-select";
import type { InquiryStatus } from "@prisma/client";

export const metadata = { title: "Inquiries" };

interface InquiriesPageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function AdminInquiriesPage({ searchParams }: InquiriesPageProps) {
  const params = await searchParams;

  const inquiries = await prisma.inquiry.findMany({
    where: {
      ...(params.status ? { status: params.status as InquiryStatus } : {}),
      ...(params.q
        ? {
            OR: [
              { inquiryNumber: { contains: params.q, mode: "insensitive" } },
              { customer: { fullName: { contains: params.q, mode: "insensitive" } } },
              { customer: { phone: { contains: params.q } } },
            ],
          }
        : {}),
    },
    include: { customer: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const exportQuery = new URLSearchParams();
  if (params.q) exportQuery.set("query", params.q);
  if (params.status) exportQuery.set("status", params.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Inquiries</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/export/inquiries/csv?${exportQuery.toString()}`}>
              <Download className="h-4 w-4" /> CSV
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/export/inquiries/excel?${exportQuery.toString()}`}>
              <Download className="h-4 w-4" /> Excel
            </a>
          </Button>
        </div>
      </div>

      <form className="max-w-sm">
        <Input name="q" defaultValue={params.q} placeholder="Search by inquiry #, name, or phone…" />
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="p-4 font-medium">Inquiry #</th>
              <th className="p-4 font-medium">Customer</th>
              <th className="p-4 font-medium">Phone</th>
              <th className="p-4 font-medium">Items</th>
              <th className="p-4 font-medium">Total</th>
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {inquiries.map((inq) => (
              <tr key={inq.id}>
                <td className="p-4">
                  <Link href={`/admin/inquiries/${inq.id}`} className="font-data hover:underline">
                    {inq.inquiryNumber}
                  </Link>
                </td>
                <td className="p-4">{inq.customer.fullName}</td>
                <td className="p-4 font-data text-muted-foreground">{inq.customer.phone}</td>
                <td className="p-4">{inq.items.length}</td>
                <td className="p-4 font-data">{formatCurrency(Number(inq.totalAmount))}</td>
                <td className="p-4 text-muted-foreground">{formatDate(inq.createdAt)}</td>
                <td className="p-4">
                  <InquiryStatusSelect inquiryId={inq.id} status={inq.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {inquiries.length === 0 && (
          <p className="p-10 text-center text-muted-foreground">No inquiries found.</p>
        )}
      </div>
    </div>
  );
}
