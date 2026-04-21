import {
  Body,
  Column,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { Fragment, type CSSProperties, type ReactNode } from "react";

export const colors = {
  text: "#0a0a0a",
  muted: "#6b7280",
  border: "#e5e7eb",
  bgPage: "#f3f4f6",
  white: "#ffffff",
  confirm: "#10b981",
  confirmBg: "#d1fae5",
  cancel: "#dc2626",
  cancelBg: "#fee2e2",
  reminder: "#f59e0b",
  reminderBg: "#fef3c7",
  notify: "#3b82f6",
  notifyBg: "#dbeafe",
  pending: "#f59e0b",
  pendingBg: "#fef3c7",
} as const;

/** Évite la détection de liens téléphone / dates / adresses dans les clients mail. */
export const noDetectInline: CSSProperties = {
  color: "inherit",
  textDecoration: "none",
};

export function emailAssetBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? "https://waevon.com").replace(/\/$/, "");
}

export function waevonLogoUrl(): string {
  return `${emailAssetBaseUrl()}/waevon-logo.png`;
}

export function EmailMetaHead() {
  return (
    <Head>
      <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no" />
      <meta name="x-apple-disable-message-reformatting" />
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media only screen and (max-width: 600px) {
            .email-main-padding { padding-left: 20px !important; padding-right: 20px !important; }
            .email-title { font-size: 22px !important; }
          }
        `,
        }}
      />
    </Head>
  );
}

/** Logo commerçant si uploadé ; sinon logo Waevon. */
export function ClientEmailHeader({ merchantLogoUrl }: { merchantLogoUrl?: string | null }) {
  const merchant = merchantLogoUrl?.trim();
  if (merchant) {
    return (
      <Section style={{ textAlign: "center", marginBottom: "20px" }}>
        <Img
          src={merchant}
          alt=""
          width={56}
          height={56}
          style={{ borderRadius: "12px", margin: "0 auto", display: "block" }}
        />
      </Section>
    );
  }
  return (
    <Section style={{ textAlign: "center", marginBottom: "20px" }}>
      <Img
        src={waevonLogoUrl()}
        alt="Waevon"
        width={48}
        height={48}
        style={{ margin: "0 auto", display: "block", borderRadius: "12px" }}
      />
    </Section>
  );
}

export function MerchantEmailHeader() {
  return (
    <Section style={{ textAlign: "center", marginBottom: "20px" }}>
      <Img
        src={waevonLogoUrl()}
        alt="Waevon"
        width={44}
        height={44}
        style={{ margin: "0 auto", display: "block", borderRadius: "10px" }}
      />
    </Section>
  );
}

export function StatusBadge({
  label,
  backgroundColor,
  color,
}: {
  label: string;
  backgroundColor: string;
  color: string;
}) {
  return (
    <Text
      style={{
        margin: "12px 0 0",
        display: "inline-block",
        padding: "6px 14px",
        borderRadius: "999px",
        fontSize: "13px",
        fontWeight: 600,
        backgroundColor,
        color,
      }}
    >
      {label}
    </Text>
  );
}

export function PlainTextParagraphs({
  paragraphs,
  style,
}: {
  paragraphs: string[];
  style?: CSSProperties;
}) {
  if (!paragraphs.length) return null;
  const base: CSSProperties = {
    margin: "0 0 14px",
    fontSize: "15px",
    lineHeight: "1.6",
    color: colors.text,
    ...style,
  };
  return (
    <>
      {paragraphs.map((para, i) => (
        <Text key={i} style={base}>
          {para.split("\n").map((line, j, arr) => (
            <Fragment key={j}>
              {line}
              {j < arr.length - 1 ? <br /> : null}
            </Fragment>
          ))}
        </Text>
      ))}
    </>
  );
}

export function InfoTable({
  rows,
}: {
  rows: { label: string; value: string; valueNoDetect?: boolean }[];
}) {
  return (
    <Section
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: "12px",
        overflow: "hidden",
        marginTop: "8px",
      }}
    >
      {rows.map((r, idx) => {
        const isLast = idx === rows.length - 1;
        const bottom = isLast ? "none" : `1px solid ${colors.border}`;
        const valStyle: CSSProperties = {
          padding: "14px 18px",
          borderBottom: bottom,
          fontSize: "15px",
          fontWeight: 600,
          color: colors.text,
          verticalAlign: "top",
          ...(r.valueNoDetect ? noDetectInline : {}),
        };
        return (
          <Row key={r.label}>
            <Column
              style={{
                width: "38%",
                maxWidth: "200px",
                padding: "14px 18px",
                borderBottom: bottom,
                fontSize: "14px",
                color: colors.muted,
                verticalAlign: "top",
              }}
            >
              {r.label}
            </Column>
            <Column style={valStyle}>
              <span style={r.valueNoDetect ? noDetectInline : undefined}>{r.value}</span>
            </Column>
          </Row>
        );
      })}
    </Section>
  );
}

export function ContactBlock({ address, phone }: { address?: string; phone?: string }) {
  if (!address?.trim() && !phone?.trim()) return null;
  return (
    <Section style={{ marginTop: "24px" }}>
      <Text style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 600, color: colors.muted }}>
        Contact
      </Text>
      {address?.trim() ? (
        <Text style={{ margin: "0 0 6px", fontSize: "15px", color: colors.text, ...noDetectInline }}>
          {address.trim()}
        </Text>
      ) : null}
      {phone?.trim() ? (
        <Text style={{ margin: 0, fontSize: "15px", color: colors.text, ...noDetectInline }}>
          {phone.trim()}
        </Text>
      ) : null}
    </Section>
  );
}

export function FooterTransaction() {
  return (
    <Section style={{ marginTop: "28px", paddingTop: "20px", borderTop: `1px solid ${colors.border}` }}>
      <Text style={{ margin: 0, fontSize: "12px", color: colors.muted, textAlign: "center" }}>
        Propulsé par{" "}
        <Link href="https://waevon.com" style={{ color: colors.muted, textDecoration: "underline" }}>
          Waevon
        </Link>
      </Text>
    </Section>
  );
}

export function FooterMarketing({ unsubscribeUrl }: { unsubscribeUrl: string }) {
  return (
    <Section style={{ marginTop: "20px" }}>
      <Text style={{ margin: "0 0 8px", fontSize: "12px", color: colors.muted, textAlign: "center" }}>
        Propulsé par{" "}
        <Link href="https://waevon.com" style={{ color: colors.muted, textDecoration: "underline" }}>
          Waevon
        </Link>
      </Text>
      <Text style={{ margin: 0, fontSize: "12px", textAlign: "center" }}>
        <Link href={unsubscribeUrl} style={{ color: colors.muted, textDecoration: "underline" }}>
          Se désabonner
        </Link>
      </Text>
    </Section>
  );
}

const shellBody: CSSProperties = {
  backgroundColor: colors.bgPage,
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: "24px 12px",
};

const card: CSSProperties = {
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: colors.white,
  borderRadius: "12px",
  padding: "32px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
};

export function EmailDocument({
  previewText,
  children,
}: {
  previewText: string;
  children: ReactNode;
}) {
  return (
    <Html lang="fr">
      <EmailMetaHead />
      <Preview>{previewText}</Preview>
      <Body style={shellBody}>
        <Container className="email-main-padding" style={card}>
          {children}
        </Container>
      </Body>
    </Html>
  );
}

export function PrimaryCta({
  href,
  label,
  marginTop = 28,
}: {
  href: string;
  label: string;
  marginTop?: number;
}) {
  return (
    <Section style={{ textAlign: "center", margin: `${marginTop}px 0 0` }}>
      <Link
        href={href}
        style={{
          display: "inline-block",
          backgroundColor: "#0a0a0a",
          color: "#ffffff",
          padding: "14px 28px",
          borderRadius: "8px",
          fontSize: "15px",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        {label}
      </Link>
    </Section>
  );
}

export function SecondaryDangerCta({ href, label }: { href: string; label: string }) {
  return (
    <Section style={{ textAlign: "center", margin: "16px 0 0" }}>
      <Link
        href={href}
        style={{
          display: "inline-block",
          backgroundColor: "#ffffff",
          color: colors.cancel,
          padding: "12px 24px",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: 600,
          textDecoration: "none",
          border: `2px solid ${colors.cancel}`,
        }}
      >
        {label}
      </Link>
    </Section>
  );
}
