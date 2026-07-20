import { z } from "zod";

export const customerRegisterSchema = z.object({
  fullName: z.string().min(2, "Enter your full name").max(120),
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .max(20)
    .regex(/^[\d+\s()-]+$/, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email address").optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
});

export const customerLoginSchema = z.object({
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .max(20)
    .regex(/^[\d+\s()-]+$/, "Enter a valid phone number"),
  password: z.string().min(1, "Enter your password"),
});

export type CustomerRegisterValues = z.infer<typeof customerRegisterSchema>;
export type CustomerLoginValues = z.infer<typeof customerLoginSchema>;
