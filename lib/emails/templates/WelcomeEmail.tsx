import { Heading, Section, Text } from "@react-email/components";
import { EmailShell, CtaButton } from "./EmailShell";
import { brand } from "@/lib/brand/config";

export default function WelcomeEmail({
  username,
  baseUrl,
}: {
  username: string;
  baseUrl: string;
}) {
  return (
    <EmailShell preview={`Bienvenue sur ${brand.name}, ${username} !`}>
      <Section style={{ marginTop: "20px" }}>
        <Heading
          style={{
            fontSize: "24px",
            lineHeight: 1.2,
            margin: 0,
            color: "#ffffff",
            fontWeight: 700,
          }}
        >
          Bienvenue {username}.
        </Heading>
        <Text style={{ marginTop: "12px", fontSize: "15px", lineHeight: 1.6, color: "rgba(245,247,255,0.75)" }}>
          Tu es prêt à pronostiquer, jouer des cartes et saboter tes potes pendant le tournoi.
        </Text>
        <Text style={{ marginTop: "16px", fontSize: "15px", lineHeight: 1.6, color: "rgba(245,247,255,0.75)" }}>
          Prochaines étapes :
        </Text>
        <ul style={{ paddingLeft: 20, color: "rgba(245,247,255,0.75)", fontSize: "15px", lineHeight: 1.6 }}>
          <li>finir tes pronostics champion + meilleur buteur ;</li>
          <li>créer ta ligue privée pour inviter tes potes ;</li>
          <li>rejoindre la ligue globale (déjà fait) pour le classement public.</li>
        </ul>
        <CtaButton href={`${baseUrl}/dashboard`} label="Ouvrir mon dashboard" />
      </Section>
    </EmailShell>
  );
}
