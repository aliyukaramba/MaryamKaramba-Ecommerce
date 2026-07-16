import { formatCurrency, formatPhoneForWhatsApp } from "./utils";

/**
 * Generates a unique, human-readable inquiry number.
 * Format: INQ-YYYYMMDD-XXXXXX  (XXXXXX = zero-padded sequence from DB count)
 */
export function generateInquiryNumber(sequence: number): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const seq = String(sequence).padStart(6, "0");
  return `INQ-${y}${m}${d}-${seq}`;
}

export interface WhatsAppMessageItem {
  productName: string;
  sku: string;
  color?: string | null;
  size?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productSlug: string;
}

export interface WhatsAppMessageInput {
  inquiryNumber: string;
  customerName: string;
  phone: string;
  city: string;
  address?: string | null;
  notes?: string | null;
  items: WhatsAppMessageItem[];
  grandTotal: number;
  siteUrl: string;
  currencySymbol?: string;
}

/**
 * Builds the exact pre-filled WhatsApp message text for an inquiry.
 * Kept as plain text (no markdown) since WhatsApp only supports
 * limited formatting (*bold*, _italic_).
 */
export function buildWhatsAppMessage(input: WhatsAppMessageInput): string {
  const {
    inquiryNumber,
    customerName,
    phone,
    city,
    address,
    notes,
    items,
    grandTotal,
    siteUrl,
    currencySymbol = "₦",
  } = input;

  const lines: string[] = [];

  lines.push("Hello. I would like to order this item.");
  lines.push("");
  lines.push("*Inquiry Number:*");
  lines.push(inquiryNumber);
  lines.push("");
  lines.push("*Customer Name:*");
  lines.push(customerName);
  lines.push("");
  lines.push("*Phone:*");
  lines.push(phone);
  lines.push("");
  lines.push("*Delivery City:*");
  lines.push(city);

  if (address) {
    lines.push("");
    lines.push("*Delivery Address:*");
    lines.push(address);
  }

  for (const item of items) {
    lines.push("");
    lines.push("----------------------------");
    lines.push("*Product:*");
    lines.push(item.productName);
    lines.push("");
    lines.push("*SKU:*");
    lines.push(item.sku);

    if (item.color) {
      lines.push("");
      lines.push("*Color:*");
      lines.push(item.color);
    }
    if (item.size) {
      lines.push("");
      lines.push("*Size:*");
      lines.push(item.size);
    }

    lines.push("");
    lines.push("*Quantity:*");
    lines.push(String(item.quantity));
    lines.push("");
    lines.push("*Price:*");
    lines.push(formatCurrency(item.unitPrice, currencySymbol));
    lines.push("");
    lines.push("*Total:*");
    lines.push(formatCurrency(item.totalPrice, currencySymbol));
    lines.push("");
    lines.push("*Product Link:*");
    lines.push(`${siteUrl}/product/${item.productSlug}`);
  }

  lines.push("----------------------------");
  lines.push("");
  lines.push("*Grand Total:*");
  lines.push(formatCurrency(grandTotal, currencySymbol));

  if (notes) {
    lines.push("");
    lines.push("*Notes:*");
    lines.push(notes);
  }

  lines.push("");
  lines.push("Please confirm availability.");

  return lines.join("\n");
}

/**
 * Builds the final wa.me deep link that opens WhatsApp with the
 * pre-filled message ready to send.
 */
export function buildWhatsAppLink(
  whatsappNumber: string,
  message: string
): string {
  const number = formatPhoneForWhatsApp(whatsappNumber);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${number}?text=${encoded}`;
}
