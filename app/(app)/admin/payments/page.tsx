import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";

export default async function AdminPaymentsPage() {
  const supabase = await createServerComponentSupabase();
  const { data: payments } = await supabase
    .from("payments")
    .select(
      "id, amount_chf, plan, status, currency, stripe_checkout_session_id, created_at, profiles:user_id(username, email)"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  type Row = {
    id: string;
    amount_chf: number | null;
    plan: string | null;
    status: string;
    currency: string;
    stripe_checkout_session_id: string | null;
    created_at: string;
    profiles: { username: string | null; email: string | null } | null;
  };
  const rows = (payments ?? []) as unknown as Row[];

  const totalsPaid = rows
    .filter((p) => p.status === "paid")
    .reduce((acc, p) => acc + Number(p.amount_chf ?? 0), 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-white">Paiements</h1>
        <p className="mt-2 text-sm text-white/55">
          Historique Stripe (création de ligues privées). Total encaissé :{" "}
          <span className="text-white">CHF {totalsPaid.toFixed(2)}</span>
        </p>
      </header>

      <section className={`${ui.glassCard} p-6`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-white/40">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Plan</th>
                <th className="px-3 py-2 text-right">Montant</th>
                <th className="px-3 py-2 text-left">Statut</th>
                <th className="px-3 py-2 text-left">Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 text-xs text-white/55">
                    {new Date(p.created_at).toLocaleString("fr-CH")}
                  </td>
                  <td className="px-3 py-2 text-white/85">
                    {p.profiles?.username ?? "—"}{" "}
                    <span className="text-[11px] text-white/40">{p.profiles?.email}</span>
                  </td>
                  <td className="px-3 py-2 uppercase text-white/70">{p.plan ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-white">
                    {p.amount_chf != null ? `${Number(p.amount_chf).toFixed(2)} ${p.currency}` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${
                        p.status === "paid"
                          ? "bg-emerald-500/20 text-emerald-200"
                          : p.status === "failed"
                            ? "bg-rose-500/20 text-rose-200"
                            : "bg-white/10 text-white/70"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px] font-mono text-white/40">
                    {p.stripe_checkout_session_id
                      ? p.stripe_checkout_session_id.slice(0, 18) + "…"
                      : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-white/50">
                    Aucun paiement enregistré.
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
