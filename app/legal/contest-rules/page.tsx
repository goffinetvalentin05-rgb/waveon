import { LegalShell } from "@/components/marketing/LegalShell";
import { brand } from "@/lib/brand/config";

export const metadata = { title: "Règlement du concours" };

export default function ContestRulesPage() {
  return (
    <LegalShell
      title="Règlement du concours"
      subtitle="Concours gratuit. Aucun achat n'est requis pour participer ni pour gagner."
      updatedAt="Mai 2026"
    >
      <h2>1. Organisateur</h2>
      <p>
        Le concours est organisé par {brand.legalEntityHint}, joignable à {brand.contactEmail}.
      </p>

      <h2>2. Gratuité</h2>
      <p>
        La participation au concours est <strong>100% gratuite et sans obligation
        d&apos;achat</strong>. Le paiement d&apos;une ligue privée ne donne aucun avantage : il
        n&apos;augmente pas les chances de gagner et ne donne pas droit à un lot supplémentaire.
      </p>

      <h2>3. Comment participer</h2>
      <ol>
        <li>Créer un compte gratuit sur {brand.name} ;</li>
        <li>indiquer son email ;</li>
        <li>choisir une équipe championne du tournoi ;</li>
        <li>choisir un joueur meilleur buteur du tournoi ;</li>
        <li>accepter le présent règlement.</li>
      </ol>
      <p>
        Les prédictions doivent être validées avant la deadline indiquée dans l&apos;application.
        Au-delà, les pronostics sont verrouillés et ne peuvent plus être modifiés.
      </p>

      <h2>4. Lot</h2>
      <p>
        Le lot est <strong>un maillot de football au choix du gagnant</strong>, d&apos;une valeur
        maximale de <strong>CHF 120</strong>. Le maillot devra être choisi parmi des modèles
        commercialement disponibles ; aucun équivalent en espèces ne sera versé.
      </p>

      <h2>5. Désignation du gagnant</h2>
      <p>
        À l&apos;issue du tournoi, le gagnant est désigné parmi les participants ayant pronostiqué
        correctement à la fois l&apos;équipe championne et le meilleur buteur. En cas
        d&apos;égalité (plusieurs bonnes réponses), un <strong>tirage au sort</strong> est
        effectué parmi les participants à égalité.
      </p>
      <p>
        Si aucun participant n&apos;a trouvé les deux bonnes réponses, le gagnant est tiré au
        sort parmi ceux ayant trouvé l&apos;équipe championne. À défaut, le tirage au sort se
        fait parmi tous les participants ayant validé une prédiction.
      </p>

      <h2>6. Conditions de participation</h2>
      <ul>
        <li>réservé aux personnes physiques majeures ;</li>
        <li>une seule participation par personne et par email ;</li>
        <li>participation interdite aux salariés et proches de l&apos;organisateur.</li>
      </ul>

      <h2>7. Non-affiliation</h2>
      <p>
        Ce concours n&apos;est pas affilié, sponsorisé, endossé ni administré par la FIFA, par la
        Coupe du Monde, par les fédérations sportives ou par les marques d&apos;équipement
        citées. Les marques mentionnées restent la propriété de leurs détenteurs respectifs.
      </p>

      <h2>8. Données personnelles</h2>
      <p>
        Les données collectées dans le cadre du concours (email, prédictions) sont traitées
        conformément à notre <a href="/legal/privacy">politique de confidentialité</a>. Les
        consentements marketing (newsletter, partenaires) sont demandés séparément et sont
        facultatifs.
      </p>

      <h2>9. Acceptation du règlement</h2>
      <p>
        La participation au concours implique l&apos;acceptation pleine et entière du présent
        règlement.
      </p>
    </LegalShell>
  );
}
