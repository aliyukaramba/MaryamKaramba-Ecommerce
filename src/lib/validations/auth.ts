import { z } from "zod";
import { strongPasswordSchema } from "@/lib/validations/password-policy";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address").toLowerCase().trim(),
  // Deliberately NOT the strong password policy here — this schema
  // verifies an EXISTING credential against bcrypt, it doesn't set a new
  // one. Enforcing today's complexity rules on login would lock out
  // legitimate accounts created under an earlier, weaker policy.
  password: z.string().min(1, "Enter your password"),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email("Enter a valid email address").toLowerCase().trim(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
