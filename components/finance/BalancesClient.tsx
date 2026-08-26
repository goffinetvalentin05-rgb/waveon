"use client";

import { useCallback, useEffect, useState } from "react";
import { ui } from "@/lib/design/tokens";
import { EmptyState } from "@/components/ui/ConfirmModal";
import type { BalanceDetailLine, BalanceEntry, Settlement } from "@/lib/finance/types";

function chf(n: number) {
  return new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(n);
}

export function BalancesClient() {
  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [details, setDetails] = useState<Record<string, BalanceDetailLine[]>>({});
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [open, setOpen] = useState<BalanceEntry | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/finance/balances");
    const data = await res.json();
    setBalances(data.balances ?? []);
    setDetails(data.details ?? {});
    setSettlements(data.settlements ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const settle = async (b: BalanceEntry) => {
    await fetch("/api/finance/balances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_person_id: b.fromId,
        to_person_id: b.toId,
        amount: b.amount,
        notes: "Remboursement marqué depuis WaveOne",
      }),
    });
    setOpen(null);
    void load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Qui doit quoi</h1>
        <p className="mt-1 text-sm text-wo-muted">Soldes nets entre les personnes, sans effacer l&apos;historique.</p>
      </div>

      {balances.length === 0 ? (
        <EmptyState title="Tout est à jour" description="Aucun solde en cours." />
      ) : (
        <div className="space-y-2">
          {balances.map((b) => (
            <button
              key={`${b.fromId}-${b.toId}`}
              type="button"
              onClick={() => setOpen(b)}
              className={`${ui.cardInteractive} flex w-full items-center justify-between px-4 py-4 text-left`}
            >
              <p className="text-sm text-wo-text">
                <span className="font-semibold text-wo-text">{b.fromName}</span>
                <span className="text-wo-muted"> → </span>
                <span className="font-semibold text-wo-text">{b.toName}</span>
              </p>
              <p className="text-base font-semibold tabular-nums text-indigo-700">{chf(b.amount)}</p>
            </button>
          ))}
        </div>
      )}

      {settlements.length > 0 ? (
        <section>
          <h2 className={ui.h2}>Remboursements</h2>
          <ul className="mt-3 space-y-2 text-sm text-wo-muted">
            {settlements.map((s) => (
              <li key={s.id}>
                {chf(Number(s.amount))} · {new Date(s.settled_at).toLocaleDateString("fr-CH")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className={ui.overlay} onClick={() => setOpen(null)} />
          <div className={`${ui.modal} max-w-lg p-6`}>
            <h3 className="text-lg font-semibold">
              {open.fromName} doit {chf(open.amount)} à {open.toName}
            </h3>
            <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto text-sm">
              {(details[`${open.fromId}::${open.toId}`] ?? []).map((line) => (
                <li key={line.expenseId} className="flex justify-between gap-3">
                  <span className="text-wo-text">{line.title}</span>
                  <span className="tabular-nums text-wo-muted">{chf(line.amount)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className={ui.btnSecondary} onClick={() => setOpen(null)}>
                Fermer
              </button>
              <button type="button" className={ui.btnPrimary} onClick={() => void settle(open)}>
                Marquer comme remboursé
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
