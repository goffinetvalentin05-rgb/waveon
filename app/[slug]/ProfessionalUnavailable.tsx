/** Page publique : commerce sans abonnement / essai expiré — aucune donnée métier affichée. */
export default function ProfessionalUnavailable() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 py-16 text-center">
      <h1 className="max-w-md text-xl font-semibold tracking-tight text-neutral-950">
        Ce professionnel n&apos;est plus disponible actuellement
      </h1>
      <p className="mt-4 max-w-sm text-sm text-neutral-600">
        Les réservations en ligne ne sont pas possibles pour le moment.
      </p>
    </div>
  );
}
