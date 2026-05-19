"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/design/tokens";

export type AdminTeamLite = {
  id: string;
  name: string;
  country_code: string | null;
  flag_emoji: string | null;
  group_name: string | null;
};

export type AdminMatch = {
  id: string;
  match_number: number | null;
  stage: string;
  group_name: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  kickoff_at: string;
  locked_at: string;
  status: "scheduled" | "live" | "finished" | "postponed";
  home_score: number | null;
  away_score: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  home: { id: string; name: string; country_code: string | null; flag_emoji: string | null } | null;
  away: { id: string; name: string; country_code: string | null; flag_emoji: string | null } | null;
};

const STAGES = [
  { id: "group", label: "Phase de groupes" },
  { id: "round_of_32", label: "16es de finale" },
  { id: "round_of_16", label: "8es de finale" },
  { id: "quarter_final", label: "Quart de finale" },
  { id: "semi_final", label: "Demi-finale" },
  { id: "third_place", label: "Match 3ème place" },
  { id: "final", label: "Finale" },
];

export function MatchesAdmin({
  matches,
  teams,
  groups,
}: {
  matches: AdminMatch[];
  teams: AdminTeamLite[];
  groups: { name: string }[];
}) {
  const router = useRouter();
  const [matchNumber, setMatchNumber] = useState<string>("");
  const [stage, setStage] = useState<string>("group");
  const [groupName, setGroupName] = useState<string>("");
  const [homeTeamId, setHomeTeamId] = useState<string>("");
  const [awayTeamId, setAwayTeamId] = useState<string>("");
  const [homePlaceholder, setHomePlaceholder] = useState<string>("");
  const [awayPlaceholder, setAwayPlaceholder] = useState<string>("");
  const [venue, setVenue] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [kickoff, setKickoff] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [importText, setImportText] = useState<string>("");
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const teamsByGroup = useMemo(() => {
    const m = new Map<string, AdminTeamLite[]>();
    for (const t of teams) {
      const k = t.group_name ?? "—";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    return m;
  }, [teams]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchNumber: matchNumber ? Number(matchNumber) : null,
          stage,
          groupName: groupName || null,
          homeTeamId: homeTeamId || null,
          awayTeamId: awayTeamId || null,
          homePlaceholder: homePlaceholder || null,
          awayPlaceholder: awayPlaceholder || null,
          venue: venue || null,
          city: city || null,
          country: country || null,
          kickoffAt: kickoff,
        }),
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(j?.error ?? "Erreur lors de la création.");
        return;
      }
      setMatchNumber("");
      setHomeTeamId("");
      setAwayTeamId("");
      setHomePlaceholder("");
      setAwayPlaceholder("");
      setVenue("");
      setCity("");
      setCountry("");
      setKickoff("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const finalize = async (
    matchId: string,
    homeScoreStr: string,
    awayScoreStr: string
  ) => {
    const homeScore = Number(homeScoreStr);
    const awayScore = Number(awayScoreStr);
    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
      alert("Scores invalides");
      return;
    }
    const res = await fetch(`/api/admin/matches/${matchId}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeScore, awayScore }),
    });
    const j = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      alert(j?.error ?? "Erreur");
      return;
    }
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce match ?")) return;
    await fetch(`/api/admin/matches/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const runImport = async () => {
    setImportBusy(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/matches/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: importText,
      });
      const j = (await res.json().catch(() => null)) as {
        ok?: boolean;
        inserted?: number;
        updated?: number;
        errors?: string[];
        error?: string;
      } | null;
      if (!res.ok) {
        setImportResult(j?.error ?? "Erreur d'import.");
        return;
      }
      const errs = j?.errors?.length ? `\nErreurs : ${j.errors.join(" | ")}` : "";
      setImportResult(`OK · ${j?.inserted ?? 0} créés / ${j?.updated ?? 0} mis à jour.${errs}`);
      router.refresh();
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Création manuelle */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/55">
          Créer un match
        </h2>
        <form onSubmit={create} className="grid gap-3 md:grid-cols-4">
          <input
            className={ui.input}
            placeholder="N° match"
            value={matchNumber}
            onChange={(e) => setMatchNumber(e.target.value.replace(/\D/g, ""))}
          />
          <select className={ui.input} value={stage} onChange={(e) => setStage(e.target.value)}>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
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
          <input
            type="datetime-local"
            className={ui.input}
            value={kickoff}
            onChange={(e) => setKickoff(e.target.value)}
            required
          />

          <TeamSelect
            label="Équipe domicile"
            teamsByGroup={teamsByGroup}
            value={homeTeamId}
            onChange={setHomeTeamId}
          />
          <input
            className={ui.input}
            placeholder="Placeholder dom. (ex: Winner A)"
            value={homePlaceholder}
            onChange={(e) => setHomePlaceholder(e.target.value)}
          />
          <TeamSelect
            label="Équipe extérieur"
            teamsByGroup={teamsByGroup}
            value={awayTeamId}
            onChange={setAwayTeamId}
          />
          <input
            className={ui.input}
            placeholder="Placeholder ext. (ex: Runner-up B)"
            value={awayPlaceholder}
            onChange={(e) => setAwayPlaceholder(e.target.value)}
          />

          <input
            className={ui.input}
            placeholder="Stade"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          />
          <input
            className={ui.input}
            placeholder="Ville"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <input
            className={ui.input}
            placeholder="Pays"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
          <button type="submit" disabled={submitting} className={ui.btnPrimary}>
            {submitting ? "Création…" : "Ajouter le match"}
          </button>
        </form>
        {error ? (
          <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        ) : null}
      </section>

      {/* Import CSV */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/55">
          Import CSV
        </h2>
        <p className="text-xs text-white/45">
          Colonnes attendues :{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/70">
            match_number,stage,group_name,home_team_code,away_team_code,home_placeholder,away_placeholder,venue,city,country,kickoff_at
          </code>
          . Le match est upserté sur <code className="text-white/70">match_number</code>.
          Les <code className="text-white/70">_team_code</code> matchent <code className="text-white/70">country_code</code>.
        </p>
        <textarea
          className={`${ui.input} min-h-[140px] font-mono text-xs`}
          placeholder={`match_number,stage,group_name,home_team_code,away_team_code,home_placeholder,away_placeholder,venue,city,country,kickoff_at
1,group,A,MEX,RSA,,,Estadio Azteca,Mexico City,MEX,2026-06-11T18:00:00Z`}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={importBusy || !importText.trim()}
            onClick={runImport}
            className={ui.btnSecondary}
          >
            {importBusy ? "Import en cours…" : "Importer"}
          </button>
          {importResult ? (
            <p className="text-xs text-white/60">{importResult}</p>
          ) : null}
        </div>
      </section>

      {/* Liste */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/55">
          {matches.length} match{matches.length > 1 ? "s" : ""}
        </h2>
        <ul className="space-y-3">
          {matches.length === 0 ? (
            <li className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/55">
              Aucun match. Ajoute-en ou importe un CSV.
            </li>
          ) : (
            matches.map((m) => (
              <MatchAdminRow key={m.id} match={m} onFinalize={finalize} onRemove={remove} />
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function TeamSelect({
  label,
  teamsByGroup,
  value,
  onChange,
}: {
  label: string;
  teamsByGroup: Map<string, AdminTeamLite[]>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <select className={ui.input} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">— {label} —</option>
      {Array.from(teamsByGroup.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([g, list]) => (
          <optgroup key={g} label={g === "—" ? "Sans groupe" : `Groupe ${g}`}>
            {list.map((t) => (
              <option key={t.id} value={t.id}>
                {t.flag_emoji ?? "🏳️"} {t.name}
              </option>
            ))}
          </optgroup>
        ))}
    </select>
  );
}

function MatchAdminRow({
  match,
  onFinalize,
  onRemove,
}: {
  match: AdminMatch;
  onFinalize: (id: string, h: string, a: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [hs, setHs] = useState<string>(match.home_score?.toString() ?? "");
  const [as, setAs] = useState<string>(match.away_score?.toString() ?? "");
  const homeName = match.home?.name ?? match.home_placeholder ?? "À déterminer";
  const awayName = match.away?.name ?? match.away_placeholder ?? "À déterminer";
  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/45">
        <span className="flex items-center gap-2">
          {match.match_number ? (
            <span className="rounded bg-white/5 px-1.5 py-0.5 font-semibold">#{match.match_number}</span>
          ) : null}
          {new Date(match.kickoff_at).toLocaleString("fr-CH", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          · {match.stage}
          {match.group_name ? ` · Groupe ${match.group_name}` : ""}
        </span>
        <span
          className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wider ${
            match.status === "finished"
              ? "bg-emerald-500/20 text-emerald-200"
              : match.status === "live"
                ? "bg-amber-500/20 text-amber-200"
                : "bg-white/10 text-white/60"
          }`}
        >
          {match.status}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white">
          {match.home?.flag_emoji ?? "🏳️"} {homeName} <span className="text-white/40">vs</span>{" "}
          {match.away?.flag_emoji ?? "🏳️"} {awayName}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className={`${ui.input} w-16`}
            value={hs}
            onChange={(e) => setHs(e.target.value)}
            min={0}
            max={20}
            placeholder="—"
          />
          <span className="text-white/40">:</span>
          <input
            type="number"
            className={`${ui.input} w-16`}
            value={as}
            onChange={(e) => setAs(e.target.value)}
            min={0}
            max={20}
            placeholder="—"
          />
          <button
            type="button"
            onClick={() => onFinalize(match.id, hs, as)}
            className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20"
          >
            {match.status === "finished" ? "Recalculer" : "Finaliser"}
          </button>
          <button
            type="button"
            onClick={() => onRemove(match.id)}
            className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1.5 text-xs text-rose-200 hover:bg-rose-500/20"
          >
            ✕
          </button>
        </div>
      </div>
      {match.venue || match.city ? (
        <div className="mt-1 text-[11px] text-white/35">
          {[match.venue, match.city, match.country].filter(Boolean).join(" — ")}
        </div>
      ) : null}
    </li>
  );
}
