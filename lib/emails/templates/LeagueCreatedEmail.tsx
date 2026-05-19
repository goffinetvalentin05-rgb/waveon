import { Heading, Section, Text } from "@react-email/components";
import { EmailShell, CtaButton } from "./EmailShell";
import { brand } from "@/lib/brand/config";

export default function LeagueCreatedEmail({
  username,
  leagueName,
  inviteUrl,
  leagueUrl,
}: {
  username: string;
  leagueName: string;
  inviteUrl: string;
  leagueUrl: string;
}) {
  return (
    <EmailShell preview={`${leagueName} est prête sur ${brand.name}`}>
      <Section style={{ marginTop: "20px" }}>
        <Heading style={{ fontSize: "24px", lineHeight: 1.2, margin: 0, color: "#ffffff", fontWeight: 700 }}>
          Ta ligue {leagueName} est prête.
        </Heading>
        <Text style={{ marginTop: "12px", fontSize: "15px", lineHeight: 1.6, color: "rgba(245,247,255,0.75)" }}>
          Bien joué {username}, le paiement est validé et tes cartes de départ sont dans ton
          inventaire.
        </Text>
        <Text style={{ marginTop: "12px", fontSize: "15px", lineHeight: 1.6, color: "rgba(245,247,255,0.75)" }}>
          Étape suivante : balance le lien d&apos;invitation sur ton groupe WhatsApp.
        </Text>
        <CtaButton href={inviteUrl} label="Inviter mes potes sur WhatsApp" />
        <Text
          style={{
            marginTop: "20px",
            textAlign: "center" as const,
            fontSize: "13px",
            color: "rgba(245,247,255,0.5)",
          }}
        >
          Ou ouvre directement la ligue : <a href={leagueUrl} style={{ color: "#93c5fd" }}>{leagueUrl}</a>
        </Text>
      </Section>
    </EmailShell>
  );
}
