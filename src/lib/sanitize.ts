import DOMPurify from "isomorphic-dompurify";

/**
 * Strips all HTML tags from user-supplied plain-text fields
 * (names, notes, addresses) before persisting to the database.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

/**
 * Sanitizes rich text fields (e.g. product description) allowing a safe
 * subset of formatting tags only.
 */
export function sanitizeRichText(input: string | null | undefined): string {
  if (!input) return "";
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ["b", "strong", "i", "em", "p", "br", "ul", "ol", "li", "a"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  }).trim();
}
