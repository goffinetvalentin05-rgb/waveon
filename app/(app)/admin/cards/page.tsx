import Link from "next/link";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";

type SearchParams = Promise<{ league?: string; user?: string; match?: string }>;

export default async function AdminCardsPage(props: { searchParams: SearchParams }) {
  const sp = await props.searchParams;
  const leagueId = sp.league?.trim() ?? "";
  const userId = sp.user?.trim() ?? "";
  const matchId = sp.match?.trim() ?? "";

  const supabase = await createServerComponentSupabase();

  let inventory: { card_id: string; quantity: number }[] = [];
  let plays: {
    id: string;
    card_id: string;
    match_id: string;
    user_id: string;
    league_id: string;
    target_user_id: string | null;
    status: string;
    played_at: string;
  }[] = [];

  if (leagueId && userId) {
    const invRes = await supabase
      .from("card_inventory")
      .select("card_id, quantity")
      .eq("league_id", leagueId)
      .eq("user_id", userId);
    inventory = (invRes.data ?? []) as typeof inventory;
  }

  if (matchId) {
    let q = supabase
      .from("card_plays")
      .select("id, card_id, match_id, user_id, league_id, target_user_id, status, played_at")
      .eq("match_id", matchId);
    if (leagueId) q = q.eq("league_id", leagueId);
    const playsRes = await q.order("played_at", { ascending: false });
    plays = (playsRes.data ?? []) as typeof plays;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-white">Debug cartes</h1>
        <p className="mt-2 text-sm text-white/55">
          Vérifie l&apos;inventaire d&apos;un membre et les cartes jouées sur un match. Ajoute les
          paramètres d&apos;URL :{" "}
          <code className="text-violet-300">?league=&lt;uuid&gt;&amp;user=&lt;uuid&gt;&amp;match=&lt;uuid&gt;</code>
        </p>
        <Link href="/admin/leagues" className="mt-2 inline-block text-xs text-violet-300 hover:underline">
          ← Ligues privées
        </Link>
      </header>

      <section className={`${ui.glassCard} space-y-4 p-6`}>
        <h2 className="text-lg font-semibold text-white">Inventaire membre</h2>
        {!leagueId || !userId ? (
          <p className="text-sm text-white/50">Renseigne league et user dans l&apos;URL.</p>
        ) : inventory.length === 0 ? (
          <p className="text-sm text-white/50">Aucune ligne d&apos;inventaire.</p>
        ) : (
          <ul className="space-y-1 text-sm text-white/80">
            {inventory.map((i) => (
              <li key={i.card_id}>
                {i.card_id} — ×{i.quantity}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${ui.glassCard} space-y-4 p-6`}>
        <h2 className="text-lg font-semibold text-white">Cartes jouées (match)</h2>
        {!matchId ? (
          <p className="text-sm text-white/50">Renseigne match dans l&apos;URL.</p>
        ) : plays.length === 0 ? (
          <p className="text-sm text-white/50">Aucune carte jouée sur ce match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-white/40">
                <tr>
                  <th className="px-2 py-1 text-left">Carte</th>
                  <th className="px-2 py-1 text-left">Joueur</th>
                  <th className="px-2 py-1 text-left">Cible</th>
                  <th className="px-2 py-1 text-left">Statut</th>
                  <th className="px-2 py-1 text-left">Jouée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {plays.map((p) => (
                  <tr key={p.id}>
                    <td className="px-2 py-2">{p.card_id}</td>
                    <td className="px-2 py-2 font-mono text-xs">{p.user_id.slice(0, 8)}…</td>
                    <td className="px-2 py-2 font-mono text-xs">
                      {p.target_user_id ? `${p.target_user_id.slice(0, 8)}…` : "—"}
                    </td>
                    <td className="px-2 py-2">{p.status}</td>
                    <td className="px-2 py-2 text-xs text-white/50">
                      {new Date(p.played_at).toLocaleString("fr-CH")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
