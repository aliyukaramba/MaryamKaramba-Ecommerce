import { z } from "zod";

export const inquiryItemSchema = z.object({
  productId: z.string().cuid(),
  variantId: z.string().cuid().optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  size: z.string().max(50).optional().nullable(),
  quantity: z
    .number({ invalid_type_error: "Quantity must be a number" })
    .int()
    .min(1, "Quantity must be at least 1")
    .max(999, "Quantity is too high"),
});

export const inquiryFormSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(120, "Full name is too long"),
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .max(20, "Phone number is too long")
    .regex(/^[\d+\s()-]+$/, "Enter a valid phone number"),
  email: z
    .string()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal(""))
    .nullable(),
  deliveryCity: z.string().min(2, "Delivery city is required").max(100),
  deliveryAddress: z.string().max(500).optional().or(z.literal("")).nullable(),
  notes: z.string().max(1000).optional().or(z.literal("")).nullable(),
  items: z.array(inquiryItemSchema).min(1, "At least one item is required"),
});

export type InquiryFormValues = z.infer<typeof inquiryFormSchema>;
export type InquiryItemValues = z.infer<typeof inquiryItemSchema>;

export const inquiryStatusUpdateSchema = z.object({
  inquiryId: z.string().cuid(),
  status: z.enum([
    "NEW",
    "PENDING",
    "CONTACTED",
    "CONFIRMED",
    "PACKING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "RETURNED",
  ]),
});
