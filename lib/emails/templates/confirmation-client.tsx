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

export interface ConfirmationClientProps {
  businessName: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  durationMin: number;
  priceCHF: string;
  address?: string;
  phone?: string;
  isPending: boolean;
}

export default function ConfirmationClient({
  businessName,
  clientName,
  serviceName,
  date,
  time,
  durationMin,
  priceCHF,
  address,
  phone,
  isPending,
}: ConfirmationClientProps) {
  const statusLabel = isPending
    ? "Demande enregistrée"
    : "Réservation confirmée";
  const statusColor = isPending ? "#d97706" : "#16a34a";
  const previewText = isPending
    ? `Votre demande chez ${businessName} est bien enregistrée`
    : `Votre réservation chez ${businessName} est confirmée`;

  return (
    <Html lang="fr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* En-tête */}
          <Section style={styles.header}>
            <Heading style={styles.businessName}>{businessName}</Heading>
            <Text style={{ ...styles.statusBadge, color: statusColor }}>
              {statusLabel}
            </Text>
          </Section>

          {/* Corps */}
          <Section style={styles.body_section}>
            <Text style={styles.greeting}>Bonjour {clientName},</Text>
            <Text style={styles.intro}>
              {isPending
                ? "Votre demande a bien été reçue. Le commerce la confirmera dans les plus brefs délais."
                : "Voici le récapitulatif de votre réservation :"}
            </Text>

            {/* Tableau récapitulatif */}
            <Section style={styles.table}>
              <InfoRow label="Prestation" value={serviceName} />
              <InfoRow label="Date" value={date} />
              <InfoRow label="Heure" value={time} />
              <InfoRow label="Durée" value={`${durationMin} min`} />
              <InfoRow label="Prix" value={priceCHF} isLast />
            </Section>

            {(address || phone) && (
              <Section style={{ marginTop: "20px" }}>
                {address && (
                  <Text style={styles.contactLine}>📍 {address}</Text>
                )}
                {phone && (
                  <Text style={styles.contactLine}>📞 {phone}</Text>
                )}
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
  table: {
    backgroundColor: "#fafaf9",
    border: "1px solid #e7e5e4",
    borderRadius: "8px",
    overflow: "hidden",
  },
  contactLine: {
    margin: "0 0 6px",
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
