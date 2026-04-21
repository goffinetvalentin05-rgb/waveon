import { Heading, Section } from "@react-email/components";
import {
  ClientEmailHeader,
  colors,
  ContactBlock,
  EmailDocument,
  FooterMarketing,
  InfoTable,
  PlainTextParagraphs,
  SecondaryDangerCta,
  StatusBadge,
} from "@/lib/emails/templates/email-shell";

export interface ReservationReminderProps {
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
  merchantLogoUrl?: string | null;
  customBodyParagraphs: string[];
  unsubscribeUrl: string;
  previewText?: string;
}

export default function ReservationReminder({
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
  merchantLogoUrl,
  customBodyParagraphs,
  unsubscribeUrl,
  previewText: previewTextProp,
}: ReservationReminderProps) {
  const previewText = previewTextProp ?? `Rappel — ${businessName}`;
  const defaultParas = [
    `Bonjour ${clientName},`,
    "Petit rappel : votre rendez-vous approche.",
  ];
  const paras =
    customBodyParagraphs.length > 0 ? customBodyParagraphs : defaultParas;

  return (
    <EmailDocument previewText={previewText}>
      <ClientEmailHeader merchantLogoUrl={merchantLogoUrl} />
      <Heading className="email-title" style={{ margin: "0 0 8px", fontSize: "24px", color: colors.text }}>
        {businessName}
      </Heading>
      <StatusBadge
        label="Rappel de rendez-vous"
        backgroundColor={colors.reminderBg}
        color={colors.reminder}
      />
      <Section style={{ marginTop: "20px" }}>
        <PlainTextParagraphs paragraphs={paras} />
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
      <FooterMarketing unsubscribeUrl={unsubscribeUrl} />
    </EmailDocument>
  );
}
