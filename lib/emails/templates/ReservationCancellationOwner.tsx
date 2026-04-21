import { Heading, Text } from "@react-email/components";
import {
  colors,
  EmailDocument,
  FooterTransaction,
  InfoTable,
  MerchantEmailHeader,
  StatusBadge,
} from "@/lib/emails/templates/email-shell";

export interface ReservationCancellationOwnerProps {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceName: string;
  date: string;
  time: string;
  durationMin: number;
}

export default function ReservationCancellationOwner({
  clientName,
  clientEmail,
  clientPhone,
  serviceName,
  date,
  time,
  durationMin,
}: ReservationCancellationOwnerProps) {
  return (
    <EmailDocument previewText={`Annulation — ${clientName}`}>
      <MerchantEmailHeader />
      <Heading className="email-title" style={{ margin: "0 0 8px", fontSize: "24px", color: colors.text }}>
        Annulation
      </Heading>
      <StatusBadge label="Réservation annulée" backgroundColor={colors.cancelBg} color={colors.cancel} />
      <Text style={{ margin: "20px 0 12px", fontSize: "15px", lineHeight: "1.6", color: colors.text }}>
        Une réservation a été annulée.
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
          { label: "Téléphone", value: clientPhone?.trim() || "—", valueNoDetect: true },
          {
            label: "Email",
            value: clientEmail?.trim() || "—",
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
        RÉSERVATION ANNULÉE
      </Text>
      <InfoTable
        rows={[
          { label: "Prestation", value: serviceName },
          { label: "Date", value: date, valueNoDetect: true },
          { label: "Heure", value: time, valueNoDetect: true },
          { label: "Durée", value: `${durationMin} min`, valueNoDetect: true },
        ]}
      />
      <FooterTransaction />
    </EmailDocument>
  );
}
