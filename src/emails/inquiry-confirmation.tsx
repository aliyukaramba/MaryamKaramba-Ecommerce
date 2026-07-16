import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface InquiryConfirmationEmailProps {
  businessName: string;
  customerName: string;
  inquiryNumber: string;
  itemsSummary: string; // e.g. "Nike Air Max 2025 (x2), Classic Leather Belt (x1)"
  total: string; // pre-formatted currency string
}

export default function InquiryConfirmationEmail({
  businessName,
  customerName,
  inquiryNumber,
  itemsSummary,
  total,
}: InquiryConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your order {inquiryNumber} has been received</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>{businessName}</Heading>
          <Text style={text}>Hi {customerName},</Text>
          <Text style={text}>
            We&apos;ve received your order and saved it as{" "}
            <strong>{inquiryNumber}</strong>. We&apos;ll confirm availability
            and delivery details with you directly on WhatsApp.
          </Text>
          <Section style={box}>
            <Text style={label}>Items</Text>
            <Text style={text}>{itemsSummary}</Text>
            <Hr style={hr} />
            <Text style={label}>Total</Text>
            <Text style={text}>{total}</Text>
          </Section>
          <Text style={footer}>
            If you didn&apos;t place this order, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#EFEAE0", fontFamily: "sans-serif", padding: "24px 0" };
const container = { backgroundColor: "#ffffff", borderRadius: "12px", padding: "32px", maxWidth: "480px", margin: "0 auto" };
const heading = { fontSize: "22px", color: "#16281F", marginBottom: "16px" };
const text = { fontSize: "14px", color: "#2b2b28", lineHeight: "1.6" };
const label = { fontSize: "12px", color: "#6b6b63", textTransform: "uppercase" as const, marginBottom: "4px" };
const box = { backgroundColor: "#F5F2EA", borderRadius: "8px", padding: "16px", margin: "16px 0" };
const hr = { borderColor: "#e2ddd0", margin: "12px 0" };
const footer = { fontSize: "12px", color: "#9a9a90", marginTop: "24px" };
