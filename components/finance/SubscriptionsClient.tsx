"use client";

import { useCallback, useEffect, useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { EmptyState, ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  EXPENSE_CATEGORIES,
  monthlyAmount,
  type FinanceSubscription,
} from "@/lib/finance/types";
import type { Person } from "@/lib/people/types";
import type { Project } from "@/lib/projects/types";

function chf(n: number) {
  return new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(n);
}

export function SubscriptionsClient({ projectId }: { projectId?: string }) {
  const [subs, setSubs] = useState<FinanceSubscription[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [show, setShow] = useState(false);
  const [toDelete, setToDelete] = useState<FinanceSubscription | null>(null);

  const load = useCallback(async () => {
    const sp = projectId ? `?project=${projectId}` : "";
    const [s, p, pr] = await Promise.all([
      fetch(`/api/subscriptions${sp}`).then((r) => r.json()),
      fetch("/api/people").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]);
    setSubs(s.subscriptions ?? []);
    setPeople(p.people ?? []);
    setProjects(pr.projects ?? []);
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const active = subs.filter((s) => s.status === "active");
  const monthly = active.reduce((sum, s) => sum + monthlyAmount(s), 0);
  const byProject = (() => {
    const map = new Map<string, number>();
    for (const s of active) {
      const key = s.project?.name ?? "Personnel";
      map.set(key, (map.get(key) ?? 0) + monthlyAmount(s));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  })();
  const byPerson = (() => {
    const map = new Map<string, number>();
    for (const s of active) {
      const key = s.payer?.name ?? "Non assigné";
      map.set(key, (map.get(key) ?? 0) + monthlyAmount(s));
    }
    return [...map.entries()];
  })();

  return (
    <div className="space-y-6">
      {projectId ? null : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className={ui.h1}>Abonnements</h1>
            <p className="mt-1 text-sm text-[#8b869c]">Coûts récurrents par projet et par personne.</p>
          </div>
          <button type="button" className={ui.btnPrimary} onClick={() => setShow(true)}>
            <IconPlus className="h-4 w-4" />
            Nouvel abonnement
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={ui.statCard}>
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#8b869c]">Mensuel</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{chf(monthly)}</p>
        </div>
        <div className={ui.statCard}>
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#8b869c]">Annuel estimé</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{chf(monthly * 12)}</p>
        </div>
        <div className={ui.statCard}>
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#8b869c]">Actifs</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{active.length}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className={`${ui.card} p-5`}>
          <h2 className={ui.h2}>Par projet</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {byProject.map(([name, value]) => (
              <li key={name} className="flex justify-between">
                <span className="text-[#c8c3d6]">{name}</span>
                <span className="tabular-nums text-[#f3f0fa]">{chf(value)}/mois</span>
              </li>
            ))}
          </ul>
        </section>
        <section className={`${ui.card} p-5`}>
          <h2 className={ui.h2}>Par personne</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {byPerson.map(([name, value]) => (
              <li key={name} className="flex justify-between">
                <span className="text-[#c8c3d6]">{name}</span>
                <span className="tabular-nums text-[#f3f0fa]">{chf(value)}/mois</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {subs.length === 0 ? (
        <EmptyState title="Aucun abonnement" />
      ) : (
        <ul className="space-y-2">
          {subs.map((s) => (
            <li key={s.id} className={`${ui.card} flex items-center justify-between px-4 py-3`}>
              <div>
                <p className="text-sm font-medium text-[#f3f0fa]">{s.name}</p>
                <p className="text-[11px] text-[#8b869c]">
                  {s.project?.name ?? "Personnel"} · {s.frequency === "yearly" ? "annuel" : s.frequency === "custom" ? "perso" : "mensuel"}
                  {s.next_renewal ? ` · prochain ${s.next_renewal}` : ""}
                  {s.status === "cancelled" ? " · résilié" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold tabular-nums">{chf(monthlyAmount(s))}/mois</span>
                <button type="button" className={ui.btnGhost} onClick={() => setToDelete(s)}>
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {show ? (
        <SubModal
          projectId={projectId}
          people={people}
          projects={projects}
          onClose={() => setShow(false)}
          onSaved={() => {
            setShow(false);
            void load();
          }}
        />
      ) : null}

      <ConfirmModal
        open={Boolean(toDelete)}
        title="Supprimer cet abonnement ?"
        tone="danger"
        confirmLabel="Supprimer"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await fetch(`/api/subscriptions/${toDelete.id}`, { method: "DELETE" });
          setToDelete(null);
          void load();
        }}
      />
    </div>
  );
}

function SubModal({
  projectId,
  people,
  projects,
  onClose,
  onSaved,
}: {
  projectId?: string;
  people: Person[];
  projects: Project[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        amount: Number(body.amount),
        project_id: body.project_id || projectId || null,
      }),
    });
    setSaving(false);
    if (res.ok) onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className={ui.overlay} onClick={onClose} />
      <form onSubmit={submit} className={`${ui.modal} max-w-lg p-6`}>
        <h2 className="text-lg font-semibold">Nouvel abonnement</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={ui.label}>Nom</label>
            <input name="name" className={ui.input} required />
          </div>
          <div>
            <label className={ui.label}>Montant</label>
            <input name="amount" type="number" step="0.01" className={ui.input} required />
          </div>
          <div>
            <label className={ui.label}>Fréquence</label>
            <select name="frequency" className={ui.input} defaultValue="monthly">
              <option value="monthly">Mensuelle</option>
              <option value="yearly">Annuelle</option>
              <option value="custom">Personnalisée</option>
            </select>
          </div>
          <div>
            <label className={ui.label}>Projet</label>
            <select name="project_id" className={ui.input} defaultValue={projectId ?? ""}>
              <option value="">Personnel</option>
              {projects.filter((p) => p.status === "active").map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={ui.label}>Payé par</label>
            <select name="paid_by" className={ui.input} defaultValue={people.find((p) => p.is_self)?.id ?? ""}>
              <option value="">—</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={ui.label}>Prochain renouvellement</label>
            <input name="next_renewal" type="date" className={ui.input} />
          </div>
          <div>
            <label className={ui.label}>Catégorie</label>
            <select name="category" className={ui.input} defaultValue="SaaS">
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className={ui.btnPrimary} disabled={saving}>
            Créer
          </button>
        </div>
      </form>
    </div>
  );
}
