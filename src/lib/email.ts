import { Resend } from "resend";
import InquiryConfirmationEmail, {
  type InquiryConfirmationEmailProps,
} from "@/emails/inquiry-confirmation";
import AdminNotificationEmail, {
  type AdminNotificationEmailProps,
} from "@/emails/admin-notification";
import PasswordResetEmail, {
  type PasswordResetEmailProps,
} from "@/emails/password-reset";
import NewsletterWelcomeEmail, {
  type NewsletterWelcomeEmailProps,
} from "@/emails/newsletter-welcome";

function isEmailEnabled(): boolean {
  return (
    process.env.ENABLE_EMAIL_NOTIFICATIONS === "true" &&
    !!process.env.RESEND_API_KEY &&
    !!process.env.EMAIL_FROM
  );
}

function getClient(): Resend | null {
  if (!isEmailEnabled()) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

/**
 * All send* helpers are intentionally fire-and-forget-safe: they never throw.
 * Email is a "nice to have" here — WhatsApp is the actual order channel — so
 * a misconfigured or down email provider must never block an order or an
 * admin action. Callers can `await` these for logging purposes but should
 * not treat a `false` result as a reason to fail the surrounding operation.
 */

export async function sendInquiryConfirmationEmail(
  to: string,
  props: InquiryConfirmationEmailProps
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    await client.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject: `Order received — ${props.inquiryNumber}`,
      react: InquiryConfirmationEmail(props),
    });
    return true;
  } catch (error) {
    console.error("sendInquiryConfirmationEmail failed:", error);
    return false;
  }
}

export async function sendAdminNotificationEmail(
  props: AdminNotificationEmailProps
): Promise<boolean> {
  const client = getClient();
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!client || !to) return false;
  try {
    await client.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject: `New order — ${props.inquiryNumber}`,
      react: AdminNotificationEmail(props),
    });
    return true;
  } catch (error) {
    console.error("sendAdminNotificationEmail failed:", error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  to: string,
  props: PasswordResetEmailProps
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    await client.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject: `Reset your ${props.businessName} admin password`,
      react: PasswordResetEmail(props),
    });
    return true;
  } catch (error) {
    console.error("sendPasswordResetEmail failed:", error);
    return false;
  }
}

export async function sendNewsletterWelcomeEmail(
  to: string,
  props: NewsletterWelcomeEmailProps
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    await client.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject: `Welcome to ${props.businessName}`,
      react: NewsletterWelcomeEmail(props),
    });
    return true;
  } catch (error) {
    console.error("sendNewsletterWelcomeEmail failed:", error);
    return false;
  }
}
