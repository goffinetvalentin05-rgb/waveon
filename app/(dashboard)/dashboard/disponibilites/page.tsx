"use client";

import { useMemo, useState } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { useToast } from "@/components/wavon/Toast";
import { validateSegments } from "@/lib/wavon/booking-logic";
import type { CustomDaySlot, DayKey, TimeSegment, WeeklyDaySchedule } from "@/lib/wavon/types";
import { DAY_LABELS, DAY_ORDER } from "@/lib/wavon/types";
import { btnGhostClass, btnPrimaryClass, cardClass, inputClass } from "@/lib/wavon/tokens";

export default function DisponibilitesPage() {
  const {
    ready,
    state,
    setAvailabilityMode,
    setWeeklyDay,
    setCustomDays,
    setBlockedDates,
  } = useWavon();
  const toast = useToast();
  const [blockInput, setBlockInput] = useState("");

  const blockedSorted = useMemo(
    () => [...state.blockedDates].sort(),
    [state.blockedDates]
  );

  const updateDay = (day: DayKey, patch: WeeklyDaySchedule) => {
    const err = validateSegments(patch.segments);
    if (err) {
      toast.push({ kind: "error", message: err });
      return;
    }
    setWeeklyDay(day, patch);
    toast.push({ message: `${DAY_LABELS[day]} enregistré.` });
  };

  const addBlocked = () => {
    const v = blockInput.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      toast.push({ kind: "error", message: "Format date : AAAA-MM-JJ" });
      return;
    }
    if (state.blockedDates.includes(v)) {
      toast.push({ message: "Date déjà bloquée." });
      return;
    }
    setBlockedDates([...state.blockedDates, v].sort());
    setBlockInput("");
    toast.push({ message: "Date bloquée." });
  };

  const removeBlocked = (d: string) => {
    setBlockedDates(state.blockedDates.filter((x) => x !== d));
    toast.push({ message: "Blocage retiré." });
  };

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 motion-safe:animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Disponibilités
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-white/60">
          Mode horaires fixes (avec pauses via plusieurs plages) ou créneaux personnalisés par date.
          Les plages ne peuvent pas se chevaucher.
        </p>
      </header>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-white">Mode</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <ModeButton
            active={state.availabilityMode === "fixed"}
            onClick={() => {
              setAvailabilityMode("fixed");
              toast.push({ message: "Mode : horaires fixes." });
            }}
            title="Horaires fixes"
            desc="Même grille chaque semaine, pauses = plusieurs plages."
          />
          <ModeButton
            active={state.availabilityMode === "custom"}
            onClick={() => {
              setAvailabilityMode("custom");
              toast.push({ message: "Mode : créneaux personnalisés." });
            }}
            title="Créneaux personnalisés"
            desc="Définis les plages jour par jour."
          />
        </div>
      </section>

      {state.availabilityMode === "fixed" ? (
        <section className="space-y-4">
          {DAY_ORDER.map((day) => (
            <DayEditor
              key={day}
              label={DAY_LABELS[day]}
              value={state.weekly[day]}
              onSave={(patch) => updateDay(day, patch)}
            />
          ))}
        </section>
      ) : (
        <CustomDaysEditor
          key={JSON.stringify(state.customDays)}
          days={state.customDays}
          onSave={(next) => {
            for (const row of next) {
              const err = validateSegments(row.segments);
              if (err) {
                toast.push({ kind: "error", message: `${row.date} : ${err}` });
                return;
              }
            }
            setCustomDays(next);
            toast.push({ message: "Créneaux personnalisés enregistrés." });
          }}
        />
      )}

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-white">Dates bloquées</h2>
        <p className="mt-1 text-sm text-white/55">
          Journées entièrement indisponibles (fériés, congés).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="date"
            className={inputClass + " max-w-[11rem]"}
            value={blockInput}
            onChange={(e) => setBlockInput(e.target.value)}
          />
          <button type="button" className={btnPrimaryClass} onClick={addBlocked}>
            Bloquer
          </button>
        </div>
        {blockedSorted.length === 0 ? (
          <p className="mt-4 text-sm text-white/50">Aucune date bloquée.</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {blockedSorted.map((d) => (
              <li
                key={d}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/5 px-3 py-1 text-xs text-white/90"
              >
                {d}
                <button
                  type="button"
                  className="text-white/50 hover:text-red-300"
                  onClick={() => removeBlocked(d)}
                  aria-label={`Retirer ${d}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`max-w-xs rounded-2xl border px-4 py-3 text-left text-sm transition ${
        active
          ? "border-emerald-500/45 bg-emerald-500/10 text-white shadow-[0_0_24px_-8px_rgba(34,197,94,0.35)]"
          : "border-white/10 bg-black/30 text-white/75 hover:border-emerald-500/25"
      }`}
    >
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-white/55">{desc}</p>
    </button>
  );
}

function DayEditor({
  label,
  value,
  onSave,
}: {
  label: string;
  value: WeeklyDaySchedule;
  onSave: (v: WeeklyDaySchedule) => void;
}) {
  const [enabled, setEnabled] = useState(value.enabled);
  const [segments, setSegments] = useState<TimeSegment[]>(value.segments);

  return (
    <div className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-white">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="size-4 rounded border-emerald-500/40 text-emerald-500"
          />
          {label}
        </label>
        <button
          type="button"
          className={btnGhostClass}
          onClick={() => setSegments([...segments, { start: "09:00", end: "12:00" }])}
        >
          + Plage
        </button>
      </div>
      {enabled ? (
        <div className="mt-4 space-y-2">
          {segments.map((seg, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                className={inputClass + " max-w-[9rem]"}
                value={seg.start}
                onChange={(e) => {
                  const next = [...segments];
                  next[i] = { ...next[i]!, start: e.target.value };
                  setSegments(next);
                }}
              />
              <span className="text-white/40">→</span>
              <input
                type="time"
                className={inputClass + " max-w-[9rem]"}
                value={seg.end}
                onChange={(e) => {
                  const next = [...segments];
                  next[i] = { ...next[i]!, end: e.target.value };
                  setSegments(next);
                }}
              />
              <button
                type="button"
                className="text-xs text-red-300/90 hover:underline"
                onClick={() => setSegments(segments.filter((_, j) => j !== i))}
              >
                Retirer
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className={`${btnPrimaryClass} mt-4`}
        onClick={() => onSave({ enabled, segments: enabled ? segments : [] })}
      >
        Enregistrer {label}
      </button>
    </div>
  );
}

function CustomDaysEditor({
  days,
  onSave,
}: {
  days: CustomDaySlot[];
  onSave: (d: CustomDaySlot[]) => void;
}) {
  const [rows, setRows] = useState<CustomDaySlot[]>(days.length ? days : []);

  const addRow = () => {
    const today = new Date().toISOString().slice(0, 10);
    setRows([...rows, { date: today, segments: [{ start: "10:00", end: "12:00" }] }]);
  };

  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Jours personnalisés</h2>
        <button type="button" className={btnGhostClass} onClick={addRow}>
          + Jour
        </button>
      </div>
      <p className="mt-2 text-sm text-white/55">
        Chaque date listée ici remplace la grille hebdomadaire pour ce jour uniquement.
      </p>
      <div className="mt-4 space-y-6">
        {rows.length === 0 ? (
          <p className="text-sm text-white/50">Ajoute au moins une date avec des plages.</p>
        ) : (
          rows.map((row, idx) => (
            <div key={idx} className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs text-white/55">Date</label>
                  <input
                    type="date"
                    className={`${inputClass} mt-1 max-w-[11rem]`}
                    value={row.date}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = { ...next[idx]!, date: e.target.value };
                      setRows(next);
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="text-xs text-red-300 hover:underline"
                  onClick={() => setRows(rows.filter((_, j) => j !== idx))}
                >
                  Supprimer ce jour
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {row.segments.map((seg, si) => (
                  <div key={si} className="flex flex-wrap items-center gap-2">
                    <input
                      type="time"
                      className={inputClass + " max-w-[9rem]"}
                      value={seg.start}
                      onChange={(e) => {
                        const next = [...rows];
                        const segs = [...next[idx]!.segments];
                        segs[si] = { ...segs[si]!, start: e.target.value };
                        next[idx] = { ...next[idx]!, segments: segs };
                        setRows(next);
                      }}
                    />
                    <span className="text-white/40">→</span>
                    <input
                      type="time"
                      className={inputClass + " max-w-[9rem]"}
                      value={seg.end}
                      onChange={(e) => {
                        const next = [...rows];
                        const segs = [...next[idx]!.segments];
                        segs[si] = { ...segs[si]!, end: e.target.value };
                        next[idx] = { ...next[idx]!, segments: segs };
                        setRows(next);
                      }}
                    />
                    <button
                      type="button"
                      className="text-xs text-red-300/80 hover:underline"
                      onClick={() => {
                        const next = [...rows];
                        next[idx] = {
                          ...next[idx]!,
                          segments: next[idx]!.segments.filter((_, j) => j !== si),
                        };
                        setRows(next);
                      }}
                    >
                      Retirer plage
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={btnGhostClass}
                  onClick={() => {
                    const next = [...rows];
                    next[idx] = {
                      ...next[idx]!,
                      segments: [...next[idx]!.segments, { start: "14:00", end: "18:00" }],
                    };
                    setRows(next);
                  }}
                >
                  + Plage
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <button type="button" className={`${btnPrimaryClass} mt-6`} onClick={() => onSave(rows)}>
        Enregistrer les créneaux personnalisés
      </button>
    </section>
  );
}
