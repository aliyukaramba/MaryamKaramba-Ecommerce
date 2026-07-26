import { z } from "zod";

// A short list of the most commonly breached/guessed passwords. This is
// deliberately not exhaustive — the goal is to block the most obvious,
// automated-guess-first candidates, not to replace a real breached-
// password database (e.g. HaveIBeenPwned's k-anonymity API), which is
// the more complete solution if this ever needs to be stronger.
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789",
  "1234567890", "qwerty123", "qwertyuiop", "letmein123", "welcome123",
  "admin1234", "iloveyou1", "sunshine1", "princess1", "football1",
  "monkey123", "dragon123", "master123", "abc123456", "trustno1",
  "passw0rd", "p@ssw0rd", "changeme1", "hello1234", "freedom123",
]);

/**
 * Applied to any field where the person is CHOOSING a new password
 * (registration, admin user creation, password reset completion).
 * Requires length, character variety, and rejects the most common
 * guessable passwords.
 */
export const strongPasswordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(72, "Password must be no more than 72 characters") // bcrypt silently ignores bytes beyond 72
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[^A-Za-z0-9]/, "Password must contain a special character")
  .refine(
    (value) => !COMMON_PASSWORDS.has(value.toLowerCase()),
    "This password is too common — please choose something less guessable"
  );
