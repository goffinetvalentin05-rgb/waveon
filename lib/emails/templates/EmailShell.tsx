import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";
import { brand } from "@/lib/brand/config";

/**
 * Coque commune des emails Prono Clash.
 * Style sobre, en accord avec l'identité dark de l'app.
 */

const body: CSSProperties = {
  backgroundColor: "#05060a",
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: "24px 12px",
  color: "#f5f7ff",
};

const card: CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
  borderRadius: "20px",
  padding: "32px",
  border: "1px solid rgba(255,255,255,0.08)",
};

const brandText: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(96, 165, 250, 0.8)",
  fontWeight: 600,
};

const footer: CSSProperties = {
  maxWidth: "560px",
  margin: "20px auto 0",
  padding: "0 32px",
  fontSize: "12px",
  color: "rgba(245,247,255,0.4)",
  textAlign: "center" as const,
};

export function EmailShell({
  preview,
  children,
}: {
  preview: string;
  children: ReactNode;
}) {
  return (
    <Html lang="fr">
      <Head>
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={card}>
          <Section style={{ textAlign: "center" }}>
            <Text style={brandText}>{brand.name}</Text>
          </Section>
          {children}
        </Container>
        <Section style={footer}>
          <Text style={{ margin: 0 }}>
            {brand.notAGamblingDisclaimer}
          </Text>
          <Text style={{ margin: "8px 0 0" }}>
            <Link href="/legal/privacy" style={{ color: "rgba(245,247,255,0.55)" }}>
              Confidentialité
            </Link>
            {" · "}
            <Link href="/legal/contest-rules" style={{ color: "rgba(245,247,255,0.55)" }}>
              Règlement
            </Link>
          </Text>
        </Section>
      </Body>
    </Html>
  );
}

export function CtaButton({ href, label }: { href: string; label: string }) {
  return (
    <Section style={{ textAlign: "center", margin: "24px 0 0" }}>
      <Link
        href={href}
        style={{
          display: "inline-block",
          background:
            "linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #a855f7 100%)",
          color: "#ffffff",
          padding: "14px 28px",
          borderRadius: "999px",
          fontSize: "15px",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        {label}
      </Link>
    </Section>
  );
}
