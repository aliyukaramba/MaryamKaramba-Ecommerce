import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string,
  currencySymbol = "₦"
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${currencySymbol}${num.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + "...";
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Formats a Nigerian (or generic) phone number into WhatsApp's expected
 * international format with no leading zero, plus signs, or spaces.
 * e.g. "08012345678" -> "2348012345678"
 */
export function formatPhoneForWhatsApp(
  phone: string,
  defaultCountryCode = "234"
): string {
  let cleaned = phone.replace(/[^\d+]/g, "");
  cleaned = cleaned.replace(/^\+/, "");

  if (cleaned.startsWith("0")) {
    cleaned = defaultCountryCode + cleaned.slice(1);
  } else if (!cleaned.startsWith(defaultCountryCode)) {
    cleaned = defaultCountryCode + cleaned;
  }

  return cleaned;
}
