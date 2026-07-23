/**
 * Generates a unique, human-readable order number.
 * Format: ORD-YYYYMMDD-XXXXXX (XXXXXX = zero-padded sequence from DB count)
 * Mirrors generateInquiryNumber() in whatsapp.ts for consistency, kept
 * separate since orders and inquiries are deliberately distinct systems.
 */
export function generateOrderNumber(sequence: number): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const seq = String(sequence).padStart(6, "0");
  return `ORD-${y}${m}${d}-${seq}`;
}

/**
 * Generates the unique reference sent to Topify. Kept distinct from the
 * order number itself (though derived from it) so the payment
 * reference format can evolve independently if ever needed.
 */
export function generatePaymentReference(orderNumber: string): string {
  return `TPY-${orderNumber}`;
}
