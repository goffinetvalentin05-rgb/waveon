import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type EmailButton = { label: string; href: string };

export interface ReminderClientProps {
  businessName: string;
  previewText: string;
  title: string;
  greeting: string;
  lines: string[];
  address?: string;
  phone?: string;
  cancelUrl?: string;
  buttons?: EmailButton[];
}

export default function ReminderClient(props: ReminderClientProps) {
  const { businessName, previewText, title, greeting, lines, address, phone, cancelUrl, buttons } = props;

  return (
    <Html lang="fr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.businessName}>{businessName}</Heading>
            <Text style={styles.statusBadge}>{title}</Text>
          </Section>

          <Section style={styles.body_section}>
            <Text style={styles.greeting}>{greeting}</Text>
            {lines.filter(Boolean).map((line, idx) => (
              <Text key={idx} style={styles.paragraph}>
                {line}
              </Text>
            ))}

            {(address || phone) && (
              <Section style={{ marginTop: "18px" }}>
                {address ? <Text style={styles.contactLine}>📍 {address}</Text> : null}
                {phone ? <Text style={styles.contactLine}>📞 {phone}</Text> : null}
              </Section>
            )}

            {buttons?.length ? (
              <Section style={{ textAlign: "center", marginTop: "24px" }}>
                {buttons.map((b) => (
                  <Button key={b.href} href={b.href} style={styles.primaryButton}>
                    {b.label}
                  </Button>
                ))}
              </Section>
            ) : null}

            {cancelUrl ? (
              <Section style={{ textAlign: "center", marginTop: "16px" }}>
                <Button href={cancelUrl} style={styles.cancelButton}>
                  Annuler ce rendez-vous
                </Button>
              </Section>
            ) : null}
          </Section>

          <Section style={styles.footer}>
            <Hr style={styles.hr} />
            <Text style={styles.footerText}>
              Propulsé par{" "}
              <a href="https://waevon.com" style={styles.footerLink}>
                Waevon
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#f5f5f4",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    margin: "0",
    padding: "0",
  },
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "32px 16px",
  },
  header: {
    backgroundColor: "#ffffff",
    borderRadius: "12px 12px 0 0",
    padding: "24px 32px 20px",
    borderBottom: "1px solid #e7e5e4",
  },
  businessName: {
    margin: "0",
    fontSize: "20px",
    fontWeight: "700",
    color: "#1c1917",
  },
  statusBadge: {
    margin: "8px 0 0",
    fontSize: "14px",
    fontWeight: "600",
    color: "#2563eb",
  },
  body_section: {
    backgroundColor: "#ffffff",
    padding: "24px 32px",
  },
  greeting: {
    margin: "0 0 12px",
    fontSize: "14px",
    color: "#1c1917",
  },
  paragraph: {
    margin: "0 0 12px",
    fontSize: "14px",
    color: "#44403c",
    lineHeight: "1.6",
    whiteSpace: "pre-line" as const,
  },
  contactLine: {
    margin: "0 0 6px",
    fontSize: "13px",
    color: "#78716c",
  },
  primaryButton: {
    backgroundColor: "#1c1917",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "700",
    padding: "12px 18px",
    textDecoration: "none",
    display: "inline-block",
    margin: "0 8px 10px",
  },
  cancelButton: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    color: "#991b1b",
    fontSize: "14px",
    fontWeight: "700",
    padding: "12px 18px",
    textDecoration: "none",
    display: "inline-block",
    border: "1px solid #fecaca",
  },
  footer: {
    backgroundColor: "#ffffff",
    borderRadius: "0 0 12px 12px",
    padding: "0 32px 24px",
  },
  hr: {
    borderColor: "#e7e5e4",
    margin: "0 0 16px",
  },
  footerText: {
    margin: "0",
    fontSize: "12px",
    color: "#a8a29e",
    textAlign: "center" as const,
  },
  footerLink: {
    color: "#a8a29e",
    textDecoration: "none",
  },
} as const;

