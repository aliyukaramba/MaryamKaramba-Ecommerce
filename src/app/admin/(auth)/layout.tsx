import { MessageCircle } from "lucide-react";

export const metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="chat-tail mx-auto flex w-fit items-center gap-2 font-display text-2xl">
          <MessageCircle className="h-6 w-6 text-accent" />
          Admin
        </div>
        {children}
      </div>
    </div>
  );
}
