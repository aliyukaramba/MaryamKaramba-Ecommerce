import "server-only";
import crypto from "crypto";

const TOPIFY_API_BASE = process.env.TOPIFY_API_BASE_URL ?? "https://apipay.topify.ng";

/**
 * Topify amounts are always integers in kobo (₦1 = 100 kobo). These
 * helpers exist so that conversion happens in exactly one place —
 * everywhere else in the app deals in plain Naira amounts (Decimal),
 * matching how the rest of the platform already stores money.
 */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

interface TopifyEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
  errors: Record<string, string[]> | null;
}

export interface TopifyTransaction {
  reference: string;
  type: string;
  amount: number; // kobo
  fee: number; // kobo
  status: "pending" | "processing" | "success" | "failed" | "expired" | string;
  provider: string;
  meta: Record<string, unknown>;
  created_at: string;
}

/**
 * Authoritative, server-side check of a transaction's real status using
 * the secret key. This is the ONLY check that should ever be trusted to
 * mark an order as paid — a client-side "success" callback can be
 * spoofed or can fire before settlement is actually final, which is
 * exactly why Topify's own docs say to always re-verify server-side.
 */
export async function verifyTopifyTransaction(
  reference: string
): Promise<TopifyTransaction> {
  const secretKey = process.env.TOPIFY_SECRET_KEY;
  if (!secretKey) {
    throw new Error("TOPIFY_SECRET_KEY is not configured.");
  }

  const res = await fetch(
    `${TOPIFY_API_BASE}/api/v1/transactions/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const body = (await res.json()) as TopifyEnvelope<TopifyTransaction>;

  if (!res.ok || !body.status) {
    throw new Error(body.message || `Topify verification failed (HTTP ${res.status})`);
  }

  return body.data;
}

/**
 * Verifies the X-Topify-Signature header: HMAC-SHA512 of the RAW request
 * body using the webhook secret. Must be computed against the raw text,
 * not a re-serialized/parsed-then-stringified version — those can differ
 * in whitespace/key ordering and silently break verification.
 */
export function verifyTopifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const webhookSecret = process.env.TOPIFY_WEBHOOK_SECRET;
  if (!webhookSecret || !signatureHeader) return false;

  const expected = crypto
    .createHmac("sha512", webhookSecret)
    .update(rawBody)
    .digest("hex");

  // Constant-time comparison to avoid timing attacks on signature checking.
  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(signatureHeader, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
