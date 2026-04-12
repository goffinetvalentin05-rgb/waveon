import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — waevon",
  description: "Conditions générales d'utilisation du service waevon.",
};

export default function ConditionsUtilisationPage() {
  return (
    <LegalPageShell title="Conditions d'utilisation">
      <p>
        Les présentes conditions encadrent l&apos;utilisation du service waevon.{" "}
        <strong>
          Ce document est un modèle générique : fais-le relire et adapter par un juriste avant de l&apos;imposer à tes
          utilisateurs.
        </strong>
      </p>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-normal text-neutral-950">1. Objet</h2>
        <p>
          waevon propose des outils de prise de rendez-vous, de gestion d&apos;agenda et de relation client aux
          professionnels. L&apos;utilisation du service implique l&apos;acceptation de ces conditions.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-normal text-neutral-950">2. Compte et accès</h2>
        <p>
          Tu t&apos;engages à fournir des informations exactes et à préserver la confidentialité de tes identifiants.
          Toute activité réalisée depuis ton compte est réputée effectuée par toi ou avec ton autorisation.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-normal text-neutral-950">3. Utilisation acceptable</h2>
        <p>
          Tu ne dois pas utiliser le service de manière frauduleuse, abusive ou contraire aux lois en vigueur, notamment
          en ce qui concerne les données personnelles de tes clients et les communications envoyées depuis la
          plateforme.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-normal text-neutral-950">4. Services et évolutions</h2>
        <p>
          Les fonctionnalités peuvent évoluer (corrections, mises à jour, nouveautés). L&apos;éditeur peut modifier ces
          conditions : les changements matériels seront portés à ta connaissance selon les modalités prévues dans le
          contrat ou sur le service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-normal text-neutral-950">5. Responsabilité</h2>
        <p>
          Dans les limites autorisées par la loi, la responsabilité de l&apos;éditeur est limitée aux dommages directs
          prévisibles. Les exclusions ou plafonds précis doivent être précisés avec ton conseil juridique.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-normal text-neutral-950">6. Résiliation</h2>
        <p>
          Les modalités de suspension ou de clôture de compte (par toi ou par l&apos;éditeur) sont celles prévues dans
          l&apos;offre souscrite et dans la documentation du service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-normal text-neutral-950">7. Droit applicable</h2>
        <p>
          Les litiges relèvent des tribunaux compétents et du droit applicable choisi dans ton contrat d&apos;abonnement
          ou les documents commerciaux définitifs.
        </p>
      </section>
    </LegalPageShell>
  );
}
