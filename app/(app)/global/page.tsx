import Link from "next/link";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";

export default async function GlobalLeaguePage() {
  const supabase = await createServerComponentSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const [totalUsersRes, totalPredictionsRes, contestSettingsRes, myPredCountRes] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("predictions")
        .select("id", { count: "exact", head: true })
        .is("league_id", null),
      supabase
        .from("contest_settings")
        .select("ends_at, is_active")
        .limit(1)
        .maybeSingle(),
      user
        ? supabase
            .from("predictions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .is("league_id", null)
        : Promise.resolve({ count: 0 }),
    ]);

  const cs = contestSettingsRes.data as
    | { ends_at: string | null; is_active: boolean }
    | null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/80">
          Gratuit · ouvert à tous
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
          Ligue générale
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/55">
          Tout le monde joue dans la même ligue générale du tournoi mondial 2026. Pronostique
          les matchs, marque des points, et tente de finir n°1 pour remporter un maillot.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Joueurs inscrits" value={String(totalUsersRes.count ?? 0)} />
        <Stat label="Pronostics enregistrés" value={String(totalPredictionsRes.count ?? 0)} />
        <Stat label="Tes pronostics" value={String(myPredCountRes.count ?? 0)} />
      </div>

      <section className={`${ui.glowCard} relative overflow-hidden p-6 sm:p-8`}>
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-violet-500/30 blur-3xl" />
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-200/80">
          Concours gratuit
        </p>
        {cs ? (
          <>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">
              Un maillot pour le meilleur pronostiqueur
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/70">
              Termine premier du classement final de la ligue générale et tente de remporter un
              maillot. Participation gratuite, aucun achat nécessaire.
            </p>
            {cs.ends_at ? (
              <p className="mt-2 text-xs text-white/45">
                Clôture le {new Date(cs.ends_at).toLocaleDateString("fr-CH")}.
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-3 text-sm text-white/55">
            Concours en cours de configuration.
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/matches" className={ui.btnPrimary}>
            Pronostiquer les prochains matchs
          </Link>
          <Link href="/global/leaderboard" className={ui.btnSecondary}>
            Voir le classement
          </Link>
          <Link href="/legal/contest-rules" className={ui.btnGhost}>
            Règlement
          </Link>
        </div>
      </section>

      <section className={`${ui.glassCard} p-6`}>
        <h2 className="text-lg font-semibold text-white">Règles MVP</h2>
        <ul className="mt-3 space-y-2 text-sm text-white/70">
          <li>• Score exact d&apos;un match : <span className="text-white">+5 pts</span></li>
          <li>• Bon vainqueur ou bon nul : <span className="text-white">+3 pts</span></li>
          <li>• Bon écart de buts : <span className="text-white">+1 pt bonus</span></li>
          <li>• Verrou au coup d&apos;envoi du match</li>
          <li>• Pas de cartes ici. Pour les cartes, il faut une ligue privée.</li>
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${ui.glassCard} p-4`}>
      <div className="text-[10px] uppercase tracking-widest text-white/45">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
