import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { upsertGoogleCustomerAccount } from "@/actions/customer-auth";
import { createCustomerSession } from "@/lib/customer-session";

const STATE_COOKIE = "google_oauth_state";
const NEXT_COOKIE = "google_oauth_next";

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  const next = cookieStore.get(NEXT_COOKIE)?.value ?? "/account";

  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(NEXT_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/account?error=google_auth_failed", origin));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/account?error=google_not_configured", origin));
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
  const redirectUri = `${siteUrl}/api/auth/google/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Google token exchange failed:", tokenData.error_description);
      return NextResponse.redirect(new URL("/account?error=google_auth_failed", origin));
    }

    // Calling Google's own userinfo endpoint directly (rather than
    // decoding the id_token ourselves) avoids needing to verify a JWT
    // signature locally — this is an authenticated server-to-server
    // call, which is inherently trustworthy.
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = (await profileRes.json()) as GoogleUserInfo;
    if (!profileRes.ok || !profile.email) {
      return NextResponse.redirect(new URL("/account?error=google_auth_failed", origin));
    }

    if (!profile.email_verified) {
      return NextResponse.redirect(new URL("/account?error=google_email_unverified", origin));
    }

    const { accountId } = await upsertGoogleCustomerAccount({
      googleId: profile.sub,
      email: profile.email,
      fullName: profile.name || profile.email,
    });

    await createCustomerSession(accountId);

    return NextResponse.redirect(new URL(next, origin));
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    return NextResponse.redirect(new URL("/account?error=google_auth_failed", origin));
  }
}
