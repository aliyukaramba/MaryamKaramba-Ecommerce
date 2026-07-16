import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { UserActiveToggle } from "@/components/admin/user-active-toggle";

export const metadata = { title: "Admin Users" };

export default async function AdminUsersPage() {
  const session = await auth();
  // Belt-and-braces: middleware already restricts this route to
  // SUPER_ADMIN, but the page checks again in case it's ever reached
  // through a path middleware doesn't cover.
  if (session?.user?.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Admin Users</h1>
        <CreateUserDialog />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Joined</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-4 font-medium">{u.name}</td>
                <td className="p-4 text-muted-foreground">{u.email}</td>
                <td className="p-4">
                  <Badge variant={u.role === "SUPER_ADMIN" ? "accent" : "secondary"}>
                    {u.role.replace("_", " ")}
                  </Badge>
                </td>
                <td className="p-4">
                  <Badge variant={u.isActive ? "outline" : "destructive"}>
                    {u.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="p-4 text-muted-foreground">{formatDate(u.createdAt)}</td>
                <td className="p-4 text-right">
                  <UserActiveToggle
                    userId={u.id}
                    isActive={u.isActive}
                    isSelf={u.id === session?.user?.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="p-10 text-center text-muted-foreground">No admin users yet.</p>
        )}
      </div>
    </div>
  );
}
