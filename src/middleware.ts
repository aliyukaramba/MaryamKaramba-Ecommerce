import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Deliberately built from the Edge-safe authConfig only, NOT the full
// auth.ts (which bundles the Prisma adapter). Middleware runs on the Edge
// runtime, which can't run Prisma's Node client — importing the full
// config here would pull that in and risk role/session data resolving
// inconsistently between middleware and everywhere else.
const { auth } = NextAuth(authConfig);

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.some((p) =>
    nextUrl.pathname.startsWith(p)
  );

  if (!isAdminRoute || isPublicAdminPath) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/admin/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Only SUPER_ADMIN may manage users / business settings
  const restrictedToSuperAdmin = ["/admin/users", "/admin/settings/business"];
  const role = req.auth?.user?.role;
  if (
    restrictedToSuperAdmin.some((p) => nextUrl.pathname.startsWith(p)) &&
    role !== "SUPER_ADMIN"
  ) {
    return NextResponse.redirect(new URL("/admin", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
