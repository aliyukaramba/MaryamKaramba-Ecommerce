import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// This reads the JWT session cookie directly, rather than going through
// the wrapped `auth()` middleware HOC (which re-runs a second, separate
// NextAuth() instance's full session pipeline). getToken() is the
// lower-level, Edge-reliable way to check auth + custom claims (like
// role) in middleware specifically — it decodes the cookie once, with
// no dependency on a second callback pipeline potentially resolving
// role differently than the main app's session does.
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"];

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.some((p) =>
    nextUrl.pathname.startsWith(p)
  );

  if (!isAdminRoute || isPublicAdminPath) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const isLoggedIn = !!token;

  if (!isLoggedIn) {
    const loginUrl = new URL("/admin/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Only SUPER_ADMIN may manage users / business settings
  const restrictedToSuperAdmin = ["/admin/users", "/admin/settings/business"];
  const role = token.role as string | undefined;
  if (
    restrictedToSuperAdmin.some((p) => nextUrl.pathname.startsWith(p)) &&
    role !== "SUPER_ADMIN"
  ) {
    return NextResponse.redirect(new URL("/admin", nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
