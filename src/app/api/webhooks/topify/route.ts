import { NextRequest, NextResponse } from "next/server";
import { verifyTopifyWebhookSignature } from "@/lib/topify";
import { confirmOrderPayment } from "@/actions/order";

/**
 * This is the durable source of truth for payment confirmation — it
 * works even if the customer closes the browser tab before the popup's
 * onSuccess callback ever fires. Topify retries delivery up to 10 times,
 * so this handler must:
 *   - respond quickly
 *   - be safe to receive the same event more than once (idempotent —
 *     handled by confirmOrderPayment checking current order status)
 *   - verify the signature against the RAW body, before any JSON parsing
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-topify-signature");

  if (!verifyTopifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload as {
    event?: string;
    data?: { reference?: string };
    reference?: string;
  };

  const eventType = event.event;
  const reference = event.data?.reference ?? event.reference;

  if (eventType === "charge.success" && reference) {
    try {
      await confirmOrderPayment(reference);
    } catch (error) {
      console.error("Webhook confirmOrderPayment failed:", error);
    }
  }

  return NextResponse.json({ received: true });
}
