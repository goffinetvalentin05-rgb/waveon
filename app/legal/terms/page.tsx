import { LegalShell } from "@/components/marketing/LegalShell";
import { brand } from "@/lib/brand/config";

export const metadata = { title: "Conditions générales d'utilisation" };

export default function TermsPage() {
  return (
    <LegalShell
      title="Conditions générales d'utilisation"
      subtitle={`Conditions applicables à l'utilisation de l'application ${brand.name}.`}
      updatedAt="Mai 2026"
    >
      <h2>1. Acceptation</h2>
      <p>
        En créant un compte sur {brand.name}, vous acceptez les présentes conditions générales,
        notre politique de confidentialité ainsi que le règlement du concours.
      </p>

      <h2>2. Nature du service</h2>
      <p>
        {brand.name} est une application de pronostics entre amis sur des matchs de football.
        <strong> Il ne s&apos;agit pas d&apos;une application de paris d&apos;argent</strong> :
        aucune mise n&apos;est faite entre joueurs et aucun gain financier n&apos;est promis aux participants.
      </p>

      <h2>3. Compte utilisateur</h2>
      <p>
        Vous êtes responsable de la confidentialité de vos identifiants. Vous vous engagez à
        fournir des informations exactes et à respecter les autres joueurs.
      </p>

      <h2>4. Paiement et ligues privées</h2>
      <p>
        Le paiement d&apos;une ligue privée donne uniquement accès aux fonctionnalités décrites
        dans le formulaire correspondant. Il s&apos;agit d&apos;un paiement unique, sans abonnement.
        Le paiement n&apos;ouvre aucun droit à un gain financier et n&apos;améliore pas les chances
        de gagner au concours gratuit.
      </p>

      <h2>5. Concours</h2>
      <p>
        Le concours est régi par un règlement séparé disponible sur <a href="/legal/contest-rules">cette page</a>.
        La participation est gratuite et sans achat requis.
      </p>

      <h2>6. Marques et propriété intellectuelle</h2>
      <p>
        {brand.name} n&apos;est affiliée ni à la FIFA, ni à la Coupe du Monde, ni aux fédérations
        ou clubs sportifs cités. Les noms et marques mentionnés restent la propriété de leurs
        détenteurs respectifs et sont utilisés à titre purement éditorial.
      </p>

      <h2>7. Modération</h2>
      <p>
        Nous nous réservons le droit de suspendre ou supprimer tout compte enfreignant ces
        conditions ou portant atteinte au bon déroulement du jeu.
      </p>

      <h2>8. Limitation de responsabilité</h2>
      <p>
        Le service est fourni « tel quel ». Nous ne garantissons pas l&apos;exactitude des
        résultats ni la disponibilité ininterrompue du service.
      </p>

      <h2>9. Droit applicable</h2>
      <p>
        Les présentes conditions sont régies par le droit suisse. Pour tout litige, contactez
        d&apos;abord {brand.contactEmail}.
      </p>
    </LegalShell>
  );
}
