"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { IconPlus } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { EmptyState, ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseCategory,
} from "@/lib/finance/types";
import type { Person } from "@/lib/people/types";
import type { Project } from "@/lib/projects/types";

function chf(n: number, currency = "CHF") {
  return new Intl.NumberFormat("fr-CH", { style: "currency", currency }).format(n);
}

export function FinancesClient({ projectId }: { projectId?: string }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [toDelete, setToDelete] = useState<Expense | null>(null);

  const load = useCallback(async () => {
    const sp = projectId ? `?project=${projectId}` : "";
    const [e, p, pr] = await Promise.all([
      fetch(`/api/expenses${sp}`).then((r) => r.json()),
      fetch("/api/people").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]);
    setExpenses(e.expenses ?? []);
    setPeople(p.people ?? []);
    setProjects(pr.projects ?? []);
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const month = new Date().toISOString().slice(0, 7);
  const monthTotal = expenses
    .filter((e) => e.expense_date?.startsWith(month))
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {projectId ? null : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className={ui.h1}>Finances</h1>
            <p className="mt-1 text-sm text-[#8a9e96]">Dépenses, partages, sans comptabilité lourde.</p>
          </div>
          <button type="button" className={ui.btnPrimary} onClick={() => setShowCreate(true)}>
            <IconPlus className="h-4 w-4" />
            Nouvelle dépense
          </button>
        </div>
      )}

      {projectId ? (
        <div className="flex justify-end">
          <button type="button" className={ui.btnPrimary} onClick={() => setShowCreate(true)}>
            <IconPlus className="h-4 w-4" />
            Nouvelle dépense
          </button>
        </div>
      ) : null}

      <div className={`${ui.statCard} max-w-xs`}>
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#8a9e96]">Ce mois</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{chf(monthTotal)}</p>
      </div>

      {expenses.length === 0 ? (
        <EmptyState title="Aucune dépense" description="Enregistre un achat pour suivre qui a payé." />
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <div key={e.id} className={`${ui.card} flex items-center justify-between gap-3 px-4 py-3`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#eef6f2]">{e.title}</p>
                <p className="text-[11px] text-[#8a9e96]">
                  {format(new Date(`${e.expense_date}T12:00:00`), "d MMM yyyy", { locale: fr })}
                  {e.category ? ` · ${e.category}` : ""}
                  {e.payer?.name ? ` · payé par ${e.payer.name}` : ""}
                  {e.project?.name ? ` · ${e.project.name}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold tabular-nums">{chf(Number(e.amount), e.currency)}</p>
                <button type="button" className={ui.btnGhost} onClick={() => setToDelete(e)}>
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate ? (
        <ExpenseModal
          projectId={projectId}
          people={people}
          projects={projects}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            void load();
          }}
        />
      ) : null}

      <ConfirmModal
        open={Boolean(toDelete)}
        title="Supprimer cette dépense ?"
        description="L'historique des soldes sera recalculé. Les remboursements déjà enregistrés restent."
        tone="danger"
        confirmLabel="Supprimer"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await fetch(`/api/expenses/${toDelete.id}`, { method: "DELETE" });
          setToDelete(null);
          void load();
        }}
      />
    </div>
  );
}

function ExpenseModal({
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
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("SaaS");
  const [paidBy, setPaidBy] = useState(people.find((p) => p.is_self)?.id ?? people[0]?.id ?? "");
  const [participants, setParticipants] = useState<string[]>(
    people.slice(0, 2).map((p) => p.id)
  );
  const [project, setProject] = useState(projectId ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [split] = useState<"equal" | "custom">("equal");
  const [custom] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setParticipants((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        amount: Number(amount),
        category,
        paid_by: paidBy || null,
        participant_ids: participants,
        project_id: project || null,
        expense_date: date,
        split_method: split,
        shares:
          split === "custom"
            ? participants.map((id) => ({ person_id: id, amount: Number(custom[id] || 0) }))
            : undefined,
      }),
    });
    setSaving(false);
    if (res.ok) onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className={ui.overlay} onClick={onClose} />
      <form onSubmit={submit} className={`${ui.modal} max-w-lg p-6`}>
        <h2 className="text-lg font-semibold">Nouvelle dépense</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={ui.label}>Titre</label>
            <input className={ui.input} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className={ui.label}>Montant (CHF)</label>
            <input
              type="number"
              step="0.01"
              className={ui.input}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={ui.label}>Date</label>
            <input type="date" className={ui.input} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className={ui.label}>Catégorie</label>
            <select className={ui.input} value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={ui.label}>Projet</label>
            <select className={ui.input} value={project} onChange={(e) => setProject(e.target.value)}>
              <option value="">Personnel</option>
              {projects.filter((p) => p.status === "active").map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={ui.label}>Payé par</label>
            <select className={ui.input} value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={ui.label}>Participants</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {people.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    participants.includes(p.id)
                      ? "bg-emerald-500/20 text-emerald-200"
                      : "bg-white/[0.05] text-[#8a9e96]"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className={ui.btnPrimary} disabled={saving}>
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
