/**
 * Safely serializes an object for embedding in a
 * `<script type="application/ld+json">` tag via dangerouslySetInnerHTML.
 *
 * Plain JSON.stringify() does NOT escape `<`, `>`, or `&` — if any
 * string value in the object (e.g. an admin-entered product name or
 * description) contains a literal `</script>`, it closes the script tag
 * early and whatever follows in the HTML is parsed as regular markup,
 * potentially executing injected script. Escaping those three
 * characters as Unicode escapes prevents that breakout while producing
 * JSON that's still parsed identically by JSON-LD consumers (search
 * engines, structured data tools) — none of them care about this
 * cosmetic difference in how `<`/`>`/`&` are encoded.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
