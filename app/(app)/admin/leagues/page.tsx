import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";

export default async function AdminLeaguesPage() {
  const supabase = await createServerComponentSupabase();
  const { data: leagues } = await supabase
    .from("leagues")
    .select(
      "id, name, slug, kind, plan, status, amount_chf, paid_at, max_players, owner_id, profiles:owner_id(username, email)"
    )
    .neq("kind", "global")
    .order("paid_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-white">Ligues privées</h1>
        <p className="mt-2 text-sm text-white/55">
          Toutes les ligues privées créées via paiement Stripe.{" "}
          <a href="/admin/cards" className="text-violet-300 hover:underline">
            Debug cartes
          </a>
        </p>
      </header>

      <section className={`${ui.glassCard} p-6`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-white/40">
              <tr>
                <th className="px-3 py-2 text-left">Nom</th>
                <th className="px-3 py-2 text-left">Plan</th>
                <th className="px-3 py-2 text-left">Owner</th>
                <th className="px-3 py-2 text-right">Players max</th>
                <th className="px-3 py-2 text-right">Montant</th>
                <th className="px-3 py-2 text-left">Payée le</th>
                <th className="px-3 py-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(leagues ?? []).map((l) => {
                const owner = l.profiles as unknown as {
                  username: string | null;
                  email: string | null;
                } | null;
                return (
                  <tr key={l.id}>
                    <td className="px-3 py-2 text-white">{l.name}</td>
                    <td className="px-3 py-2 uppercase text-white/70">{l.plan ?? l.kind}</td>
                    <td className="px-3 py-2 text-white/70">
                      {owner?.username ?? "—"}
                      <div className="text-[11px] text-white/40">{owner?.email}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-white/70">
                      {l.max_players}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-white">
                      {l.amount_chf ? `${Number(l.amount_chf).toFixed(2)} CHF` : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-white/50">
                      {l.paid_at ? new Date(l.paid_at as string).toLocaleString("fr-CH") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-white/70">
                        {l.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(leagues ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-white/50">
                    Aucune ligue privée créée pour le moment.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
