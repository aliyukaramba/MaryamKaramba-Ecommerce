import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Middleware only checks whether the visitor is logged in at all — it
// does NOT attempt any role-based restriction. Role-specific access
// control (SUPER_ADMIN-only pages) is enforced directly in those pages'
// Server Components instead, where session/role resolution has been
// confirmed to work reliably. Two different approaches to reading the
// JWT in Edge middleware (the wrapped auth() HOC, and getToken()
// directly) both proved unreliable for the role field specifically in
// this environment — one silently misread the role, the other crashed
// outright. Keeping middleware to the simple, well-tested "logged in or
// not" check avoids that whole class of Edge-runtime risk, since a
// middleware crash takes down every admin route at once.
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

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
