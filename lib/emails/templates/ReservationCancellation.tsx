import { Heading, Section } from "@react-email/components";
import {
  ClientEmailHeader,
  colors,
  EmailDocument,
  FooterTransaction,
  InfoTable,
  PlainTextParagraphs,
  PrimaryCta,
  StatusBadge,
} from "@/lib/emails/templates/email-shell";

export interface ReservationCancellationProps {
  businessName: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  durationMin: number;
  formattedPrice: string;
  rebookUrl: string;
  merchantLogoUrl?: string | null;
  reason?: string;
  customIntroParagraphs?: string[];
}

export default function ReservationCancellation({
  businessName,
  clientName,
  serviceName,
  date,
  time,
  durationMin,
  formattedPrice,
  rebookUrl,
  merchantLogoUrl,
  reason,
  customIntroParagraphs,
}: ReservationCancellationProps) {
  const previewText = `Réservation annulée — ${businessName}`;
  const defaultParas = [`Bonjour ${clientName},`, "Votre réservation a bien été annulée."];
  const intro =
    customIntroParagraphs && customIntroParagraphs.length > 0
      ? customIntroParagraphs
      : defaultParas;
  const extra =
    reason?.trim() && !(customIntroParagraphs && customIntroParagraphs.length)
      ? [`Motif : ${reason.trim()}`]
      : [];

  return (
    <EmailDocument previewText={previewText}>
      <ClientEmailHeader merchantLogoUrl={merchantLogoUrl} />
      <Heading className="email-title" style={{ margin: "0 0 8px", fontSize: "24px", color: colors.text }}>
        {businessName}
      </Heading>
      <StatusBadge label="Réservation annulée" backgroundColor={colors.cancelBg} color={colors.cancel} />
      <Section style={{ marginTop: "20px" }}>
        <PlainTextParagraphs paragraphs={[...intro, ...extra]} />
      </Section>
      <Section style={{ marginTop: "8px" }}>
        <InfoTable
          rows={[
            { label: "Prestation", value: serviceName },
            { label: "Date", value: date, valueNoDetect: true },
            { label: "Heure", value: time, valueNoDetect: true },
            { label: "Durée", value: `${durationMin} min`, valueNoDetect: true },
            { label: "Prix", value: formattedPrice, valueNoDetect: true },
          ]}
        />
      </Section>
      <PrimaryCta href={rebookUrl} label="Prendre un nouveau rendez-vous" />
      <FooterTransaction />
    </EmailDocument>
  );
}
