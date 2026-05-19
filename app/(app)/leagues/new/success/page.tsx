import { redirect } from "next/navigation";

/** Ancienne URL de succès — redirige vers le nouveau flux checkout. */
export default async function LegacyLeagueSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : null;
  if (sessionId) {
    redirect(`/leagues/checkout/success?session_id=${encodeURIComponent(sessionId)}`);
  }
  redirect("/leagues/new");
}
