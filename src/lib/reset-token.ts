import crypto from "crypto";

/**
 * Hashes a password-reset token for storage. SHA-256 (not bcrypt) is
 * the right tool here: the raw token is already high-entropy random
 * bytes (not a human-guessable secret like a password), so it doesn't
 * need slow, salted hashing to resist brute force — a fast cryptographic
 * hash is sufficient and appropriate. This is purely to ensure that if
 * the database is ever exposed, the stored value alone can't be used to
 * reset anyone's password (the raw token only ever exists in the
 * emailed link and the browser that clicked it).
 */
export function hashResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
