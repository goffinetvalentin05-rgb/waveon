"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/design/tokens";

type Team = {
  id: string;
  name: string;
  short_code: string | null;
  color: string | null;
  group_label: string | null;
  is_outsider: boolean;
};

export function TeamsAdmin({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [groupLabel, setGroupLabel] = useState("");
  const [isOutsider, setIsOutsider] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          shortCode: shortCode.trim() || null,
          groupLabel: groupLabel.trim() || null,
          isOutsider,
        }),
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(j?.error ?? "Erreur.");
        return;
      }
      setName("");
      setShortCode("");
      setGroupLabel("");
      setIsOutsider(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette équipe ?")) return;
    await fetch(`/api/admin/teams/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const toggleOutsider = async (id: string, current: boolean) => {
    await fetch(`/api/admin/teams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOutsider: !current }),
    });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="grid gap-3 sm:grid-cols-[1fr_120px_1fr_auto]">
        <input
          className={ui.input}
          placeholder="Nom de l'équipe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className={ui.input}
          placeholder="Code (3 lettres)"
          value={shortCode}
          onChange={(e) => setShortCode(e.target.value.toUpperCase())}
          maxLength={3}
        />
        <input
          className={ui.input}
          placeholder="Groupe (ex: A)"
          value={groupLabel}
          onChange={(e) => setGroupLabel(e.target.value)}
          maxLength={4}
        />
        <button type="submit" disabled={submitting} className={ui.btnPrimary}>
          {submitting ? "…" : "Ajouter"}
        </button>
        <label className="col-span-full flex items-center gap-2 text-xs text-white/70">
          <input
            type="checkbox"
            checked={isOutsider}
            onChange={(e) => setIsOutsider(e.target.checked)}
            className="h-4 w-4"
          />
          Marquer comme outsider (carte « Outsider » lui donne bonus)
        </label>
      </form>

      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <ul className="space-y-2">
        {teams.length === 0 ? (
          <li className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/55">
            Aucune équipe. Ajoute-en au moins 2 pour pouvoir créer un match.
          </li>
        ) : (
          teams.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5"
            >
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  {t.name}
                  {t.short_code ? (
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
                      {t.short_code}
                    </span>
                  ) : null}
                  {t.is_outsider ? (
                    <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-200">
                      outsider
                    </span>
                  ) : null}
                </div>
                {t.group_label ? (
                  <div className="text-[11px] text-white/40">Groupe {t.group_label}</div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleOutsider(t.id, t.is_outsider)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
                >
                  {t.is_outsider ? "Retirer outsider" : "Marquer outsider"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
