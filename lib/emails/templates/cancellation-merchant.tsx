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

export interface CancellationMerchantProps {
  businessName: string;
  clientName: string;
  clientPhone?: string;
  serviceName: string;
  date: string;
  time: string;
}

export default function CancellationMerchant({
  businessName,
  clientName,
  clientPhone,
  serviceName,
  date,
  time,
}: CancellationMerchantProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>
        Annulation de réservation — {clientName} le {date}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* En-tête */}
          <Section style={styles.header}>
            <Heading style={styles.businessName}>{businessName}</Heading>
            <Text style={styles.statusBadge}>❌ Réservation annulée</Text>
          </Section>

          {/* Corps */}
          <Section style={styles.body_section}>
            <Text style={styles.intro}>
              Un client vient d&apos;annuler sa réservation.
            </Text>

            <Text style={styles.sectionLabel}>CLIENT</Text>
            <Section style={styles.table}>
              <InfoRow label="Nom" value={clientName} />
              <InfoRow
                label="Téléphone"
                value={clientPhone ?? "Non renseigné"}
                isLast
              />
            </Section>

            <Text style={{ ...styles.sectionLabel, marginTop: "20px" }}>
              RÉSERVATION ANNULÉE
            </Text>
            <Section style={styles.table}>
              <InfoRow label="Prestation" value={serviceName} />
              <InfoRow label="Date" value={date} />
              <InfoRow label="Heure" value={time} isLast />
            </Section>
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
  intro: {
    margin: "0 0 20px",
    fontSize: "14px",
    color: "#44403c",
    lineHeight: "1.6",
  },
  sectionLabel: {
    margin: "0 0 8px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#a8a29e",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  table: {
    backgroundColor: "#fafaf9",
    border: "1px solid #e7e5e4",
    borderRadius: "8px",
    overflow: "hidden",
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
