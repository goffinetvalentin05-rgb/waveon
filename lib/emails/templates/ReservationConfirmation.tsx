import { Heading, Section, Text } from "@react-email/components";
import {
  ClientEmailHeader,
  colors,
  ContactBlock,
  EmailDocument,
  FooterTransaction,
  InfoTable,
  PlainTextParagraphs,
  SecondaryDangerCta,
  StatusBadge,
} from "@/lib/emails/templates/email-shell";

export interface ReservationConfirmationProps {
  businessName: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  durationMin: number;
  formattedPrice: string;
  address?: string;
  phone?: string;
  cancelUrl?: string;
  isPending: boolean;
  merchantLogoUrl?: string | null;
  /** Paragraphes issus du template personnalisé (après rendu des variables). */
  customIntroParagraphs?: string[];
}

export default function ReservationConfirmation({
  businessName,
  clientName,
  serviceName,
  date,
  time,
  durationMin,
  formattedPrice,
  address,
  phone,
  cancelUrl,
  isPending,
  merchantLogoUrl,
  customIntroParagraphs,
}: ReservationConfirmationProps) {
  const badgeLabel = isPending ? "Demande enregistrée" : "Réservation confirmée";
  const badgeBg = isPending ? colors.pendingBg : colors.confirmBg;
  const badgeColor = isPending ? colors.pending : colors.confirm;
  const previewText = isPending
    ? `Demande enregistrée — ${businessName}`
    : `Réservation confirmée — ${businessName}`;

  const defaultIntro = isPending
    ? [
        `Bonjour ${clientName}, votre demande a bien été reçue. Le commerce la confirmera dans les plus brefs délais. Voici les détails :`,
      ]
    : [`Bonjour ${clientName}, votre réservation est confirmée. Voici les détails :`];
  const intro =
    customIntroParagraphs && customIntroParagraphs.length > 0
      ? customIntroParagraphs
      : defaultIntro;

  return (
    <EmailDocument previewText={previewText}>
      <ClientEmailHeader merchantLogoUrl={merchantLogoUrl} />
      <Heading className="email-title" style={{ margin: "0 0 8px", fontSize: "24px", color: colors.text }}>
        {businessName}
      </Heading>
      <StatusBadge label={badgeLabel} backgroundColor={badgeBg} color={badgeColor} />
      <Section style={{ marginTop: "20px" }}>
        <PlainTextParagraphs paragraphs={intro} />
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
      <ContactBlock address={address} phone={phone} />
      {cancelUrl ? <SecondaryDangerCta href={cancelUrl} label="Annuler ce rendez-vous" /> : null}
      <Text style={{ margin: "16px 0 0", fontSize: "12px", color: colors.muted, textAlign: "center" }}>
        Si vous n&apos;êtes pas à l&apos;origine de cette réservation, vous pouvez ignorer cet email.
      </Text>
      <FooterTransaction />
    </EmailDocument>
  );
}
