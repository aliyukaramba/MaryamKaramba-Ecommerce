import Link from "next/link";
import {
  Package,
  MessagesSquare,
  Users,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatCard } from "@/components/admin/stat-card";
import { InquiriesChart } from "@/components/admin/inquiries-chart";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Dashboard" };

async function getDashboardData() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    productCount,
    inquiryCount,
    customerCount,
    pendingInquiryCount,
    publishedProductsForStockCheck,
    recentInquiries,
    recentProducts,
    inquiriesLast30Days,
    revenueAgg,
  ] = await Promise.all([
    prisma.product.count({ where: { status: "PUBLISHED" } }),
    prisma.inquiry.count(),
    prisma.customer.count(),
    prisma.inquiry.count({ where: { status: { in: ["NEW", "PENDING"] } } }),
    // Prisma can't compare two columns (stock <= lowStockThreshold) in a
    // plain where clause without raw SQL, so we filter in JS below.
    prisma.product.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, name: true, stock: true, lowStockThreshold: true },
    }),
    prisma.inquiry.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { customer: true, items: { include: { product: true } } },
    }),
    prisma.product.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.inquiry.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.inquiry.aggregate({ _sum: { totalAmount: true } }),
  ]);

  const lowStockProducts = publishedProductsForStockCheck
    .filter((p) => p.stock <= p.lowStockThreshold)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);

  const chartMap = new Map<string, number>();
  for (const inq of inquiriesLast30Days) {
    const key = inq.createdAt.toISOString().slice(5, 10);
    chartMap.set(key, (chartMap.get(key) ?? 0) + 1);
  }
  const chartData = Array.from(chartMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    productCount,
    inquiryCount,
    customerCount,
    pendingInquiryCount,
    lowStockProducts,
    recentInquiries,
    recentProducts,
    chartData,
    totalRevenue: Number(revenueAgg._sum.totalAmount ?? 0),
  };
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Published Products" value={String(data.productCount)} icon={Package} />
        <StatCard label="Total Inquiries" value={String(data.inquiryCount)} icon={MessagesSquare} accent />
        <StatCard label="Customers" value={String(data.customerCount)} icon={Users} />
        <StatCard
          label="Total Order Value"
          value={formatCurrency(data.totalRevenue)}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="mb-4 font-medium">Inquiries — last 30 days</h2>
          <InquiriesChart data={data.chartData} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="font-medium">Low Stock Alerts</h2>
          </div>
          {data.lowStockProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">All products are well-stocked.</p>
          ) : (
            <ul className="space-y-3">
              {data.lowStockProducts.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <Link href={`/admin/products/${p.id}/edit`} className="line-clamp-1 hover:underline">
                    {p.name}
                  </Link>
                  <Badge variant="destructive">{p.stock} left</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Recent Inquiries</h2>
            <Link href="/admin/inquiries" className="text-xs text-accent hover:underline">
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {data.recentInquiries.map((inq) => (
              <li key={inq.id} className="flex items-center justify-between py-3">
                <div>
                  <Link
                    href={`/admin/inquiries/${inq.id}`}
                    className="font-data text-sm hover:underline"
                  >
                    {inq.inquiryNumber}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {inq.customer.fullName} · {formatDate(inq.createdAt)}
                  </p>
                </div>
                <Badge variant="outline">{inq.status}</Badge>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Recent Products</h2>
            <Link href="/admin/products" className="text-xs text-accent hover:underline">
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {data.recentProducts.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <Link href={`/admin/products/${p.id}/edit`} className="text-sm hover:underline">
                  {p.name}
                </Link>
                <span className="font-data text-xs text-muted-foreground">
                  {formatCurrency(Number(p.salePrice ?? p.price))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
