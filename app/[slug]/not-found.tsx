import Link from "next/link";

export default function PublicBookingNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f7f5] px-6 py-16 text-center">
      <h1 className="max-w-md text-lg font-semibold text-neutral-950">Page de réservation introuvable</h1>
      <p className="mt-3 max-w-sm text-sm text-neutral-600">
        Ce lien ne correspond à aucun commerce actif, ou l’identifiant est incorrect. Vérifie l’URL ou
        contacte le professionnel.
      </p>
      <p className="mt-8 text-sm text-neutral-500">
        <Link href="/" className="font-medium text-neutral-800 underline-offset-4 hover:underline">
          Retour à l’accueil
        </Link>
      </p>
    </div>
  );
}
