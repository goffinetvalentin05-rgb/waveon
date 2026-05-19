import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";

export default async function AdminLeaguesPage() {
  const supabase = await createServerComponentSupabase();
  const { data: leagues } = await supabase
    .from("leagues")
    .select("id, name, slug, kind, plan, status, amount_chf, paid_at, owner_id, profiles:owner_id(username, email)")
    .neq("kind", "global")
    .order("paid_at", { ascending: false });

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount_chf, plan, status, created_at, profiles:user_id(username, email)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-white">Ligues & paiements</h1>
        <p className="mt-2 text-sm text-white/55">
          Liste des ligues privées créées et historique des paiements Stripe.
        </p>
      </header>

      <section className={`${ui.glassCard} p-6`}>
        <h2 className="text-lg font-semibold text-white">Ligues privées</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-white/40">
              <tr>
                <th className="px-3 py-2 text-left">Nom</th>
                <th className="px-3 py-2 text-left">Plan</th>
                <th className="px-3 py-2 text-left">Owner</th>
                <th className="px-3 py-2 text-right">Montant</th>
                <th className="px-3 py-2 text-left">Payée le</th>
                <th className="px-3 py-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(leagues ?? []).map((l) => {
                const owner = l.profiles as unknown as { username: string | null; email: string | null } | null;
                return (
                  <tr key={l.id}>
                    <td className="px-3 py-2 text-white">{l.name}</td>
                    <td className="px-3 py-2 uppercase text-white/70">{l.plan ?? l.kind}</td>
                    <td className="px-3 py-2 text-white/70">
                      {owner?.username ?? "—"}
                      <div className="text-[11px] text-white/40">{owner?.email}</div>
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
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${ui.glassCard} p-6`}>
        <h2 className="text-lg font-semibold text-white">Paiements</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-white/40">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Plan</th>
                <th className="px-3 py-2 text-right">Montant</th>
                <th className="px-3 py-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(payments ?? []).map((p) => {
                const u = p.profiles as unknown as { username: string | null; email: string | null } | null;
                return (
                  <tr key={p.id}>
                    <td className="px-3 py-2 text-xs text-white/55">
                      {new Date(p.created_at).toLocaleString("fr-CH")}
                    </td>
                    <td className="px-3 py-2 text-white/85">
                      {u?.username ?? "—"} <span className="text-[11px] text-white/40">{u?.email}</span>
                    </td>
                    <td className="px-3 py-2 uppercase text-white/70">{p.plan}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-white">
                      {Number(p.amount_chf).toFixed(2)} CHF
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-white/70">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
