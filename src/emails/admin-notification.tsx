import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface AdminNotificationEmailProps {
  inquiryNumber: string;
  customerName: string;
  customerPhone: string;
  itemsSummary: string;
  total: string;
  adminUrl: string; // link to the inquiry detail page
}

export default function AdminNotificationEmail({
  inquiryNumber,
  customerName,
  customerPhone,
  itemsSummary,
  total,
  adminUrl,
}: AdminNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New order {inquiryNumber} from {customerName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>New order received</Heading>
          <Section style={box}>
            <Text style={row}><strong>Inquiry:</strong> {inquiryNumber}</Text>
            <Text style={row}><strong>Customer:</strong> {customerName}</Text>
            <Text style={row}><strong>Phone:</strong> {customerPhone}</Text>
            <Text style={row}><strong>Items:</strong> {itemsSummary}</Text>
            <Text style={row}><strong>Total:</strong> {total}</Text>
          </Section>
          <Text style={text}>
            View and manage this order: <a href={adminUrl}>{adminUrl}</a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#EFEAE0", fontFamily: "sans-serif", padding: "24px 0" };
const container = { backgroundColor: "#ffffff", borderRadius: "12px", padding: "32px", maxWidth: "480px", margin: "0 auto" };
const heading = { fontSize: "20px", color: "#16281F", marginBottom: "16px" };
const text = { fontSize: "14px", color: "#2b2b28", lineHeight: "1.6" };
const row = { fontSize: "14px", color: "#2b2b28", margin: "4px 0" };
const box = { backgroundColor: "#F5F2EA", borderRadius: "8px", padding: "16px", margin: "16px 0" };
