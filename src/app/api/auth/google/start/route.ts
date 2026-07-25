import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

const STATE_COOKIE = "google_oauth_state";
const NEXT_COOKIE = "google_oauth_next";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/account?error=google_not_configured", req.nextUrl.origin)
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  const redirectUri = `${siteUrl}/api/auth/google/callback`;

  const next = req.nextUrl.searchParams.get("next") ?? "/account";

  const state = crypto.randomBytes(24).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  cookieStore.set(NEXT_COOKIE, next, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.searchParams.set("client_id", clientId);
  googleUrl.searchParams.set("redirect_uri", redirectUri);
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", "openid email profile");
  googleUrl.searchParams.set("state", state);
  googleUrl.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(googleUrl.toString());
}
