import { Heading, Section } from "@react-email/components";
import {
  ClientEmailHeader,
  colors,
  EmailDocument,
  FooterMarketing,
  PrimaryCta,
  StatusBadge,
  PlainTextParagraphs,
} from "@/lib/emails/templates/email-shell";

export type PostServiceButton = { label: string; href: string };

export interface ReservationPostServiceProps {
  businessName: string;
  clientName: string;
  merchantLogoUrl?: string | null;
  customBodyParagraphs: string[];
  buttons: PostServiceButton[];
  unsubscribeUrl: string;
  previewText?: string;
}

export default function ReservationPostService({
  businessName,
  clientName,
  merchantLogoUrl,
  customBodyParagraphs,
  buttons,
  unsubscribeUrl,
  previewText: previewTextProp,
}: ReservationPostServiceProps) {
  const previewText = previewTextProp ?? `Merci — ${businessName}`;
  const defaultParas = [`Bonjour ${clientName},`, "Merci pour votre visite."];
  const paras =
    customBodyParagraphs.length > 0 ? customBodyParagraphs : defaultParas;

  return (
    <EmailDocument previewText={previewText}>
      <ClientEmailHeader merchantLogoUrl={merchantLogoUrl} />
      <Heading className="email-title" style={{ margin: "0 0 8px", fontSize: "24px", color: colors.text }}>
        {businessName}
      </Heading>
      <StatusBadge label="Merci de votre visite" backgroundColor={colors.confirmBg} color={colors.confirm} />
      <Section style={{ marginTop: "20px" }}>
        <PlainTextParagraphs paragraphs={paras} />
      </Section>
      {buttons.map((b, i) => (
        <PrimaryCta key={b.href} href={b.href} label={b.label} marginTop={i === 0 ? 24 : 12} />
      ))}
      <FooterMarketing unsubscribeUrl={unsubscribeUrl} />
    </EmailDocument>
  );
}
