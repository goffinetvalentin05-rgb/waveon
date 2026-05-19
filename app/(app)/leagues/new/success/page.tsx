import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ui } from "@/lib/design/tokens";

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function LeagueSuccessPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await props.searchParams;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : null;
  if (!sessionId) redirect("/dashboard");

  const supabase = await createServerComponentSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminSupabaseClient();
  // Le webhook crée la ligue. En attendant qu'il arrive, on poll.
  type LeagueRow = { slug: string; name: string; invite_code: string | null };
  let leagueRow: LeagueRow | null = null;
  for (let i = 0; i < 6; i++) {
    const res = await admin
      .from("leagues")
      .select("slug, name, invite_code")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();
    if (res.data) {
      leagueRow = res.data as unknown as LeagueRow;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className={`${ui.glowCard} p-8 text-center`}>
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-[0_15px_40px_-15px_rgba(16,185,129,0.6)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-5 font-display text-3xl font-semibold text-white">
          Ligue créée !
        </h1>
        {leagueRow ? (
          <>
            <p className="mt-2 text-sm text-white/65">
              <span className="font-semibold text-white">{leagueRow.name}</span> est prête.
              Invite tes potes maintenant pour qu&apos;ils rejoignent avant le coup d&apos;envoi.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href={`/leagues/${leagueRow.slug}`} className={ui.btnPrimary}>
                Ouvrir ma ligue
              </Link>
              <Link href={`/leagues/${leagueRow.slug}/invite`} className={ui.btnSecondary}>
                Inviter sur WhatsApp
              </Link>
            </div>
          </>
        ) : (
          <p className="mt-5 text-sm text-white/65">
            On enregistre ton paiement… Ta ligue apparaîtra dans le dashboard d&apos;ici quelques secondes.
            <br />
            <Link href="/dashboard" className="mt-3 inline-block text-sm font-medium text-blue-300 hover:text-blue-200">
              Aller au dashboard
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
