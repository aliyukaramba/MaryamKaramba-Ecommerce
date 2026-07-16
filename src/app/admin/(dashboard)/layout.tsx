import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";
import { AdminShell } from "@/components/admin/shell";

export const metadata = {
  title: {
    default: "Admin Dashboard",
    template: "%s | Admin Dashboard",
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // The login/forgot/reset pages render their own minimal layout and
  // must not be wrapped in the authenticated shell — middleware already
  // allows unauthenticated access to those specific paths.
  if (!session?.user) {
    redirect("/admin/login");
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <AdminShell
        role={session.user.role}
        userName={session.user.name ?? "Admin"}
        userEmail={session.user.email ?? ""}
      >
        {children}
      </AdminShell>
    </ThemeProvider>
  );
}
