import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Politique de confidentialité — waevon",
  description: "Politique de confidentialité du service waevon.",
};

export default function ConfidentialitePage() {
  return (
    <LegalPageShell title="Politique de confidentialité">
      <p>
        La présente politique décrit comment waevon traite les données personnelles lorsque tu utilises le service.{" "}
        <strong>
          Ce document est fourni à titre indicatif : fais-le valider par un professionnel du droit avant toute mise en
          production.
        </strong>
      </p>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-normal text-neutral-950">1. Responsable du traitement</h2>
        <p>
          Les traitements sont réalisés par l&apos;éditeur du service waevon, dans le cadre de la relation contractuelle
          avec les professionnels inscrits et de l&apos;usage de la plateforme par leurs clients.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-normal text-neutral-950">2. Données collectées</h2>
        <p>
          Sont notamment concernées : les informations de compte (identité, coordonnées), les données liées aux
          rendez-vous et à la relation client, ainsi que les données techniques nécessaires au fonctionnement et à la
          sécurité du service (journaux, identifiants de session, etc.).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-normal text-neutral-950">3. Finalités</h2>
        <p>
          Les données sont utilisées pour fournir le service (réservations, agenda, facturation le cas échéant),
          améliorer l&apos;expérience utilisateur, assurer la sécurité et répondre aux obligations légales applicables.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-normal text-neutral-950">4. Durée de conservation</h2>
        <p>
          Les données sont conservées pendant la durée nécessaire aux finalités poursuivies, puis archivées ou supprimées
          selon les délais légaux et les réglages du service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-normal text-neutral-950">5. Tes droits</h2>
        <p>
          Conformément au RGPD, tu peux exercer tes droits d&apos;accès, de rectification, d&apos;effacement, de
          limitation, d&apos;opposition et de portabilité lorsque cela s&apos;applique, en contactant l&apos;éditeur du
          service à l&apos;adresse indiquée sur le site ou dans l&apos;application.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-normal text-neutral-950">6. Modifications</h2>
        <p>
          Cette politique peut être mise à jour. La version en vigueur est celle publiée sur cette page, avec indication
          de la date de dernière mise à jour si tu l&apos;ajoutes côté contenu.
        </p>
      </section>
    </LegalPageShell>
  );
}
