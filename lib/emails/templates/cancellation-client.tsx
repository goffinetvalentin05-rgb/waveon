import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

export interface CancellationClientProps {
  businessName: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  phone?: string;
  reason?: string;
}

export default function CancellationClient({
  businessName,
  clientName,
  serviceName,
  date,
  time,
  phone,
  reason,
}: CancellationClientProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>
        Votre réservation chez {businessName} a été annulée
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* En-tête */}
          <Section style={styles.header}>
            <Heading style={styles.businessName}>{businessName}</Heading>
            <Text style={styles.statusBadge}>Réservation annulée</Text>
          </Section>

          {/* Corps */}
          <Section style={styles.body_section}>
            <Text style={styles.greeting}>Bonjour {clientName},</Text>
            <Text style={styles.intro}>
              Votre réservation a malheureusement été annulée.
            </Text>

            {reason && (
              <Text style={styles.reason}>Motif : {reason}</Text>
            )}

            <Section style={styles.table}>
              <InfoRow label="Prestation" value={serviceName} />
              <InfoRow label="Date" value={date} />
              <InfoRow label="Heure" value={time} isLast />
            </Section>

            {phone && (
              <Section style={{ marginTop: "20px" }}>
                <Text style={styles.contactIntro}>
                  Pour reprendre rendez-vous, contactez directement le commerce :
                </Text>
                <Text style={styles.contactLine}>📞 {phone}</Text>
              </Section>
            )}
          </Section>

          {/* Pied de page */}
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

function InfoRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  const borderStyle = isLast ? "none" : "1px solid #e7e5e4";
  return (
    <Row>
      <Column
        style={{
          padding: "10px 16px",
          borderBottom: borderStyle,
          color: "#78716c",
          fontSize: "13px",
          width: "130px",
          minWidth: "130px",
          verticalAlign: "top" as const,
        }}
      >
        {label}
      </Column>
      <Column
        style={{
          padding: "10px 16px",
          borderBottom: borderStyle,
          color: "#1c1917",
          fontSize: "13px",
          fontWeight: "600",
          verticalAlign: "top" as const,
        }}
      >
        {value}
      </Column>
    </Row>
  );
}

const styles = {
  body: {
    backgroundColor: "#f5f5f4",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
    color: "#dc2626",
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
  intro: {
    margin: "0 0 20px",
    fontSize: "14px",
    color: "#44403c",
    lineHeight: "1.6",
  },
  reason: {
    margin: "0 0 16px",
    fontSize: "13px",
    color: "#78716c",
    backgroundColor: "#fafaf9",
    border: "1px solid #e7e5e4",
    borderRadius: "8px",
    padding: "10px 14px",
    fontStyle: "italic",
  },
  table: {
    backgroundColor: "#fafaf9",
    border: "1px solid #e7e5e4",
    borderRadius: "8px",
    overflow: "hidden",
  },
  contactIntro: {
    margin: "0 0 8px",
    fontSize: "13px",
    color: "#44403c",
  },
  contactLine: {
    margin: "0",
    fontSize: "13px",
    color: "#78716c",
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
