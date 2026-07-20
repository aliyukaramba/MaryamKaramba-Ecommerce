import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "customer_session";
const SESSION_DURATION_DAYS = 30;

function getSecret(): Uint8Array {
  // Deliberately a distinct secret from AUTH_SECRET (admin auth) — a
  // compromise of one session system should never compromise the other.
  // Falls back to AUTH_SECRET only if CUSTOMER_AUTH_SECRET isn't set, so
  // this doesn't hard-fail existing deployments that haven't added the
  // new env var yet.
  const secret = process.env.CUSTOMER_AUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "CUSTOMER_AUTH_SECRET (or AUTH_SECRET as a fallback) must be set to use customer accounts."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface CustomerSessionPayload {
  customerAccountId: string;
}

export async function createCustomerSession(customerAccountId: string): Promise<void> {
  const token = await new SignJWT({ customerAccountId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  });
}

export async function getCustomerSession(): Promise<CustomerSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.customerAccountId !== "string") return null;
    return { customerAccountId: payload.customerAccountId };
  } catch {
    // Expired, tampered, or signed with a different secret (e.g. after a
    // secret rotation) — treat exactly like "not logged in", never throw.
    return null;
  }
}

export async function clearCustomerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
