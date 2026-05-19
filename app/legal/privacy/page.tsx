import { LegalShell } from "@/components/marketing/LegalShell";
import { brand } from "@/lib/brand/config";

export const metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Politique de confidentialité"
      subtitle="Comment nous traitons tes données personnelles."
      updatedAt="Mai 2026"
    >
      <h2>1. Données collectées</h2>
      <p>Nous collectons :</p>
      <ul>
        <li>ton email (compte, communications transactionnelles) ;</li>
        <li>ton pseudo et ta couleur d&apos;avatar ;</li>
        <li>tes prédictions, pronostics, et événements liés aux cartes jouées ;</li>
        <li>l&apos;historique de tes paiements Stripe (montants, dates, mais aucune donnée bancaire).</li>
      </ul>

      <h2>2. Finalités</h2>
      <p>Nous utilisons ces données pour :</p>
      <ul>
        <li>faire fonctionner le jeu (classements, ligues, scoring) ;</li>
        <li>t&apos;envoyer les emails strictement nécessaires (confirmation d&apos;inscription, ligue créée, invitations, rappels) ;</li>
        <li>te contacter uniquement avec ton consentement explicite et séparé (case dédiée).</li>
      </ul>

      <h2>3. Consentements séparés</h2>
      <p>
        Conformément au RGPD et à la LPD suisse, nous ne mélangeons pas les consentements.
        Tu peux accepter les conditions sans pour autant accepter les emails marketing, et
        tu peux accepter les emails marketing sans pour autant accepter qu&apos;on partage ton
        adresse avec des partenaires.
      </p>

      <h2>4. Partage avec des partenaires</h2>
      <p>
        Nous ne partageons ton email avec un partenaire football sélectionné <strong>que si</strong>{" "}
        tu as expressément coché la case « Recevoir des offres de partenaires » lors de
        l&apos;onboarding. Tu peux retirer ce consentement à tout moment en écrivant à
        {" "}{brand.contactEmail}.
      </p>

      <h2>5. Sous-traitants</h2>
      <ul>
        <li>Supabase (hébergement de la base, auth) ;</li>
        <li>Stripe (paiements) ;</li>
        <li>Resend (envoi d&apos;emails transactionnels) ;</li>
        <li>Vercel (hébergement de l&apos;application web).</li>
      </ul>

      <h2>6. Durée de conservation</h2>
      <p>
        Les données de compte sont conservées tant que ton compte est actif. Tu peux demander
        leur suppression à {brand.contactEmail}.
      </p>

      <h2>7. Tes droits</h2>
      <p>
        Tu disposes d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, d&apos;opposition et
        de portabilité sur tes données. Contact : {brand.contactEmail}.
      </p>
    </LegalShell>
  );
}
