import { Heading, Text } from "@react-email/components";
import {
  colors,
  EmailDocument,
  FooterTransaction,
  InfoTable,
  MerchantEmailHeader,
  PrimaryCta,
  StatusBadge,
} from "@/lib/emails/templates/email-shell";

export interface ReservationNotificationProps {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceName: string;
  employeeName?: string;
  date: string;
  time: string;
  durationMin: number;
  dashboardUrl: string;
  isPending: boolean;
}

export default function ReservationNotification({
  clientName,
  clientEmail,
  clientPhone,
  serviceName,
  employeeName,
  date,
  time,
  durationMin,
  dashboardUrl,
  isPending,
}: ReservationNotificationProps) {
  const previewText = isPending
    ? `Nouvelle demande — ${clientName}`
    : `Nouvelle réservation — ${clientName}`;

  return (
    <EmailDocument previewText={previewText}>
      <MerchantEmailHeader />
      <Heading className="email-title" style={{ margin: "0 0 8px", fontSize: "24px", color: colors.text }}>
        Nouvelle réservation
      </Heading>
      <StatusBadge
        label="Nouvelle résa"
        backgroundColor={colors.notifyBg}
        color={colors.notify}
      />
      <Text style={{ margin: "20px 0 12px", fontSize: "15px", lineHeight: "1.6", color: colors.text }}>
        Une nouvelle réservation vient d&apos;être enregistrée.
      </Text>
      <Text
        style={{
          margin: "0 0 8px",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.06em",
          color: colors.muted,
        }}
      >
        CLIENT
      </Text>
      <InfoTable
        rows={[
          { label: "Nom", value: clientName },
          {
            label: "Téléphone",
            value: clientPhone?.trim() || "—",
            valueNoDetect: true,
          },
          {
            label: "Email",
            value: clientEmail?.trim() || "Non renseigné",
            valueNoDetect: true,
          },
        ]}
      />
      <Text
        style={{
          margin: "24px 0 8px",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.06em",
          color: colors.muted,
        }}
      >
        RÉSERVATION
      </Text>
      <InfoTable
        rows={[
          { label: "Prestation", value: serviceName },
          ...(employeeName?.trim()
            ? [{ label: "Prestataire", value: employeeName.trim() }]
            : []),
          { label: "Date", value: date, valueNoDetect: true },
          { label: "Heure", value: time, valueNoDetect: true },
          { label: "Durée", value: `${durationMin} min`, valueNoDetect: true },
        ]}
      />
      <PrimaryCta href={dashboardUrl} label="Voir dans le dashboard" />
      <FooterTransaction />
    </EmailDocument>
  );
}
