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
        d&apos;achat</strong>. Le paiement d&apos;une ligue privée{" "}
        <strong>n&apos;augmente pas les chances de gagner</strong> et ne donne droit à
        aucun lot supplémentaire.
      </p>

      <h2>3. Comment participer</h2>
      <ol>
        <li>Créer un compte gratuit sur {brand.name} ;</li>
        <li>compléter l&apos;onboarding (pseudo, avatar) ;</li>
        <li>accepter les conditions générales et le présent règlement ;</li>
        <li>
          rejoindre automatiquement la <strong>ligue générale</strong> (gratuite, ouverte
          à tous) ;
        </li>
        <li>pronostiquer les matchs du tournoi mondial 2026.</li>
      </ol>
      <p>
        Chaque pronostic doit être validé avant le coup d&apos;envoi du match concerné.
        Après le coup d&apos;envoi, le pronostic est verrouillé.
      </p>

      <h2>4. Désignation du gagnant</h2>
      <p>
        Le gagnant du concours est l&apos;utilisateur qui termine{" "}
        <strong>premier du classement général</strong> à la fin du tournoi.
      </p>
      <p>En cas d&apos;égalité parfaite de points, les règles de départage suivantes sont appliquées dans l&apos;ordre :</p>
      <ol>
        <li>nombre de <strong>scores exacts</strong> sur l&apos;ensemble du tournoi ;</li>
        <li>nombre de <strong>bons vainqueurs</strong> ;</li>
        <li>nombre de <strong>pronostics enregistrés</strong> ;</li>
        <li>
          si égalité parfaite persiste : <strong>tirage au sort manuel</strong> par
          l&apos;organisateur parmi les participants à égalité.
        </li>
      </ol>

      <h2>5. Lot</h2>
      <p>
        Le lot est <strong>un maillot de football au choix du gagnant ou un bon
        équivalent</strong>, d&apos;une valeur maximale de <strong>CHF 120</strong>. Le
        maillot devra être choisi parmi des modèles commercialement disponibles ;
        aucun équivalent en espèces ne sera versé.
      </p>

      <h2>6. Conditions de participation</h2>
      <ul>
        <li>réservé aux personnes physiques majeures ;</li>
        <li>une seule participation par personne et par email ;</li>
        <li>participation interdite aux salariés et proches de l&apos;organisateur.</li>
      </ul>

      <h2>7. Non-affiliation officielle</h2>
      <p>
        Ce concours n&apos;est pas affilié, sponsorisé, endossé ni administré par la FIFA,
        par la Coupe du Monde, par les fédérations sportives ou par les marques
        d&apos;équipement citées. Les noms d&apos;équipes et les marques mentionnées
        restent la propriété de leurs détenteurs respectifs.
      </p>
      <p>
        {brand.name} est un jeu de pronostics entre amis,{" "}
        <strong>sans mise d&apos;argent</strong> et sans lien officiel avec les compétitions
        professionnelles.
      </p>

      <h2>8. Données personnelles</h2>
      <p>
        Les données collectées dans le cadre du concours (email, pronostics) sont traitées
        conformément à notre <a href="/legal/privacy">politique de confidentialité</a>. Les
        consentements marketing (newsletter Prono Clash, offres partenaires) sont demandés
        séparément et sont facultatifs.
      </p>

      <h2>9. Acceptation du règlement</h2>
      <p>
        La participation au concours implique l&apos;acceptation pleine et entière du présent
        règlement.
      </p>
    </LegalShell>
  );
}
