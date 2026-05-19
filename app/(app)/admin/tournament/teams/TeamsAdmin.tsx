"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/design/tokens";

export type AdminTeam = {
  id: string;
  name: string;
  country_code: string | null;
  flag_emoji: string | null;
  group_name: string | null;
  display_order: number;
  is_active: boolean;
  is_outsider: boolean;
};

export function TeamsAdmin({
  teams,
  groups,
}: {
  teams: AdminTeam[];
  groups: { name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [flag, setFlag] = useState("");
  const [groupName, setGroupName] = useState("");
  const [isOutsider, setIsOutsider] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<string, AdminTeam[]>();
    for (const t of teams) {
      const k = t.group_name ?? "—";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [teams]);

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
          countryCode: countryCode.trim().toUpperCase() || null,
          flagEmoji: flag.trim() || null,
          groupName: groupName.trim() || null,
          isOutsider,
        }),
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(j?.error ?? "Erreur.");
        return;
      }
      setName("");
      setCountryCode("");
      setFlag("");
      setGroupName("");
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

  const patch = async (id: string, payload: Record<string, unknown>) => {
    await fetch(`/api/admin/teams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="grid gap-3 sm:grid-cols-[1fr_100px_80px_120px_auto]">
        <input
          className={ui.input}
          placeholder="Nom de l'équipe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className={ui.input}
          placeholder="Code (3)"
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
          maxLength={3}
        />
        <input
          className={ui.input}
          placeholder="🏳️"
          value={flag}
          onChange={(e) => setFlag(e.target.value)}
        />
        <select
          className={ui.input}
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        >
          <option value="">— Groupe —</option>
          {groups.map((g) => (
            <option key={g.name} value={g.name}>
              Groupe {g.name}
            </option>
          ))}
        </select>
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
          Marquer comme outsider
        </label>
      </form>

      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="space-y-4">
        {grouped.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/55">
            Aucune équipe enregistrée.
          </p>
        ) : (
          grouped.map(([groupKey, list]) => (
            <div key={groupKey}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">
                {groupKey === "—" ? "Sans groupe" : `Groupe ${groupKey}`} · {list.length}
              </h3>
              <ul className="space-y-2">
                {list.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg leading-none">{t.flag_emoji ?? "🏳️"}</span>
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                          {t.name}
                          {t.country_code ? (
                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
                              {t.country_code}
                            </span>
                          ) : null}
                          {t.is_outsider ? (
                            <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-200">
                              outsider
                            </span>
                          ) : null}
                          {!t.is_active ? (
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">
                              désactivé
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => patch(t.id, { isOutsider: !t.is_outsider })}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
                      >
                        {t.is_outsider ? "− outsider" : "+ outsider"}
                      </button>
                      <button
                        type="button"
                        onClick={() => patch(t.id, { isActive: !t.is_active })}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
                      >
                        {t.is_active ? "Désactiver" : "Activer"}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(t.id)}
                        className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
