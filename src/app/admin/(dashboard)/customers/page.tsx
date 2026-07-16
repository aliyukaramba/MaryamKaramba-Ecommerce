import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Customers" };

interface CustomersPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminCustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;

  const customers = await prisma.customer.findMany({
    where: params.q
      ? {
          OR: [
            { fullName: { contains: params.q, mode: "insensitive" } },
            { phone: { contains: params.q } },
            { email: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { _count: { select: { inquiries: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Customers</h1>

      <form className="max-w-sm">
        <Input name="q" defaultValue={params.q} placeholder="Search by name, phone, or email…" />
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Phone</th>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">City</th>
              <th className="p-4 font-medium">Inquiries</th>
              <th className="p-4 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="p-4 font-medium">{c.fullName}</td>
                <td className="p-4 font-data text-muted-foreground">{c.phone}</td>
                <td className="p-4 text-muted-foreground">{c.email ?? "—"}</td>
                <td className="p-4">{c.deliveryCity}</td>
                <td className="p-4">{c._count.inquiries}</td>
                <td className="p-4 text-muted-foreground">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && (
          <p className="p-10 text-center text-muted-foreground">No customers found.</p>
        )}
      </div>
    </div>
  );
}
