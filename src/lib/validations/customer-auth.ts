import { z } from "zod";
import { strongPasswordSchema } from "@/lib/validations/password-policy";

export const customerRegisterSchema = z.object({
  fullName: z.string().min(2, "Enter your full name").max(120),
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .max(20)
    .regex(/^[\d+\s()-]+$/, "Enter a valid phone number"),
  email: z
    .string()
    .email("Enter a valid email address")
    .toLowerCase()
    .trim()
    .optional()
    .or(z.literal("")),
  password: strongPasswordSchema,
});

export const customerLoginSchema = z.object({
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .max(20)
    .regex(/^[\d+\s()-]+$/, "Enter a valid phone number"),
  // Not the strong policy — this verifies an existing password, it
  // doesn't set a new one.
  password: z.string().min(1, "Enter your password"),
});

export const customerRequestPasswordResetSchema = z.object({
  email: z.string().email("Enter a valid email address").toLowerCase().trim(),
});

export const customerResetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type CustomerRegisterValues = z.infer<typeof customerRegisterSchema>;
export type CustomerLoginValues = z.infer<typeof customerLoginSchema>;
export type CustomerResetPasswordValues = z.infer<typeof customerResetPasswordSchema>;
