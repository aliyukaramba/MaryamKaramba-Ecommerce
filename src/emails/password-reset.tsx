import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

export interface PasswordResetEmailProps {
  businessName: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export default function PasswordResetEmail({
  businessName,
  resetUrl,
  expiresInMinutes = 60,
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your {businessName} admin password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Reset your password</Heading>
          <Text style={text}>
            We received a request to reset the password for your{" "}
            {businessName} admin account. This link expires in{" "}
            {expiresInMinutes} minutes.
          </Text>
          <Button href={resetUrl} style={button}>
            Reset password
          </Button>
          <Text style={footer}>
            If you didn&apos;t request this, you can safely ignore this
            email — your password won&apos;t change.
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
const button = {
  backgroundColor: "#16281F",
  color: "#F5F2EA",
  padding: "12px 24px",
  borderRadius: "8px",
  fontSize: "14px",
  textDecoration: "none",
  display: "inline-block",
  margin: "16px 0",
};
const footer = { fontSize: "12px", color: "#9a9a90", marginTop: "24px" };
