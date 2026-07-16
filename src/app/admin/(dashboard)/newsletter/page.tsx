import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Newsletter" };

export default async function AdminNewsletterPage() {
  const subscribers = await prisma.newsletter.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Newsletter</h1>
        <p className="text-sm text-muted-foreground">
          {subscribers.filter((s) => s.isSubscribed).length} active subscribers
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Subscribed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {subscribers.map((s) => (
              <tr key={s.id}>
                <td className="p-4">{s.email}</td>
                <td className="p-4">
                  <Badge variant={s.isSubscribed ? "default" : "outline"}>
                    {s.isSubscribed ? "Subscribed" : "Unsubscribed"}
                  </Badge>
                </td>
                <td className="p-4 text-muted-foreground">{formatDate(s.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {subscribers.length === 0 && (
          <p className="p-10 text-center text-muted-foreground">No subscribers yet.</p>
        )}
      </div>
    </div>
  );
}
