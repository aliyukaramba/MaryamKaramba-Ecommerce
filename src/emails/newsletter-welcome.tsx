import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

export interface NewsletterWelcomeEmailProps {
  businessName: string;
  shopUrl: string;
}

export default function NewsletterWelcomeEmail({
  businessName,
  shopUrl,
}: NewsletterWelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You&apos;re subscribed to {businessName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>You&apos;re in</Heading>
          <Text style={text}>
            Thanks for subscribing to {businessName}. We&apos;ll let you know
            when new products and offers drop — nothing more.
          </Text>
          <Text style={text}>
            In the meantime, <a href={shopUrl}>browse the catalog</a>.
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
