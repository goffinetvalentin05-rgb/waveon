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
          <li>pronostiquer les prochains matchs de la ligue générale ;</li>
          <li>grimper au classement et tenter de remporter le maillot du concours (selon règlement) ;</li>
          <li>créer une ligue privée pour inviter tes potes et jouer des cartes.</li>
        </ul>
        <CtaButton href={`${baseUrl}/dashboard`} label="Ouvrir mon dashboard" />
      </Section>
    </EmailShell>
  );
}
