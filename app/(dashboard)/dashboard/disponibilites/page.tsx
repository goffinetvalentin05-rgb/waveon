"use client";

import { useMemo, useState } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import { useToast } from "@/components/wavon/Toast";
import { validateSegments } from "@/lib/wavon/booking-logic";
import type { CustomDaySlot, DayKey, TimeSegment, WeeklyDaySchedule } from "@/lib/wavon/types";
import { DAY_LABELS, DAY_ORDER } from "@/lib/wavon/types";
import {
  btnGhostClass,
  btnPrimaryClass,
  cardClass,
  inputClass,
  labelClass,
  sectionDescClass,
  sectionTitleClass,
  spinnerClass,
} from "@/lib/wavon/tokens";

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
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className={spinnerClass} aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      <PageHeader
        title="Disponibilités"
        description="Horaires d’ouverture, pauses et exceptions. Les plages ne peuvent pas se chevaucher."
      />

      <section className={cardClass}>
        <h2 className={sectionTitleClass}>Mode de planning</h2>
        <p className={sectionDescClass}>
          Grille hebdomadaire récurrente, ou journées définies une par une.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ModeButton
            active={state.availabilityMode === "fixed"}
            onClick={() => {
              setAvailabilityMode("fixed");
              toast.push({ message: "Mode : horaires fixes." });
            }}
            title="Horaires fixes"
            desc="Même grille chaque semaine. Les pauses = plusieurs plages dans la journée."
          />
          <ModeButton
            active={state.availabilityMode === "custom"}
            onClick={() => {
              setAvailabilityMode("custom");
              toast.push({ message: "Mode : exceptions jour par jour." });
            }}
            title="Créneaux personnalisés"
            desc="Pour certaines dates seulement, en complément ou à la place de la semaine."
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
        <h2 className={sectionTitleClass}>Dates bloquées</h2>
        <p className={sectionDescClass}>Journées entièrement fermées (fériés, congés, etc.).</p>
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <div>
            <label className={labelClass}>Choisir une date</label>
            <input
              type="date"
              className={`${inputClass} mt-2 max-w-[12rem]`}
              value={blockInput}
              onChange={(e) => setBlockInput(e.target.value)}
            />
          </div>
          <button type="button" className={btnPrimaryClass} onClick={addBlocked}>
            Bloquer
          </button>
        </div>
        {blockedSorted.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-500">Aucune date bloquée.</p>
        ) : (
          <ul className="mt-6 flex flex-wrap gap-2">
            {blockedSorted.map((d) => (
              <li
                key={d}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200/90 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-800"
              >
                {d}
                <button
                  type="button"
                  className="text-neutral-400 transition hover:text-red-600"
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
      className={`max-w-sm rounded-2xl border px-5 py-4 text-left text-sm transition ${
        active
          ? "border-neutral-900 bg-neutral-950 text-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)]"
          : "border-neutral-200/90 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/80"
      }`}
    >
      <p className={`font-semibold ${active ? "text-white" : "text-neutral-950"}`}>{title}</p>
      <p className={`mt-1.5 text-xs leading-relaxed ${active ? "text-white/75" : "text-neutral-500"}`}>
        {desc}
      </p>
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
        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-neutral-950">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="size-4 rounded border-neutral-300 text-neutral-950"
          />
          {label}
        </label>
        <button
          type="button"
          className={btnGhostClass + " min-h-10 py-2 text-xs"}
          onClick={() => setSegments([...segments, { start: "09:00", end: "12:00" }])}
        >
          + Plage horaire
        </button>
      </div>
      {enabled ? (
        <div className="mt-5 space-y-3 rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4">
          {segments.map((seg, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                className={inputClass + " max-w-[9.5rem]"}
                value={seg.start}
                onChange={(e) => {
                  const next = [...segments];
                  next[i] = { ...next[i]!, start: e.target.value };
                  setSegments(next);
                }}
              />
              <span className="text-neutral-300">→</span>
              <input
                type="time"
                className={inputClass + " max-w-[9.5rem]"}
                value={seg.end}
                onChange={(e) => {
                  const next = [...segments];
                  next[i] = { ...next[i]!, end: e.target.value };
                  setSegments(next);
                }}
              />
              <button
                type="button"
                className="text-xs font-medium text-red-600/90 underline-offset-4 hover:underline"
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
        className={`${btnPrimaryClass} mt-5`}
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
        <div>
          <h2 className={sectionTitleClass}>Jours personnalisés</h2>
          <p className={sectionDescClass}>
            Chaque date remplace la grille hebdomadaire pour ce jour uniquement.
          </p>
        </div>
        <button type="button" className={btnGhostClass + " min-h-10 shrink-0 py-2 text-xs"} onClick={addRow}>
          + Ajouter une date
        </button>
      </div>
      <div className="mt-6 space-y-6">
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500">Ajoute une date et des plages horaires.</p>
        ) : (
          rows.map((row, idx) => (
            <div key={idx} className="rounded-2xl border border-neutral-100 bg-neutral-50/40 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    className={`${inputClass} mt-2 max-w-[12rem]`}
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
                  className="text-xs font-medium text-red-600/90 underline-offset-4 hover:underline"
                  onClick={() => setRows(rows.filter((_, j) => j !== idx))}
                >
                  Supprimer ce jour
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {row.segments.map((seg, si) => (
                  <div key={si} className="flex flex-wrap items-center gap-2">
                    <input
                      type="time"
                      className={inputClass + " max-w-[9.5rem]"}
                      value={seg.start}
                      onChange={(e) => {
                        const next = [...rows];
                        const segs = [...next[idx]!.segments];
                        segs[si] = { ...segs[si]!, start: e.target.value };
                        next[idx] = { ...next[idx]!, segments: segs };
                        setRows(next);
                      }}
                    />
                    <span className="text-neutral-300">→</span>
                    <input
                      type="time"
                      className={inputClass + " max-w-[9.5rem]"}
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
                      className="text-xs text-red-600/90 underline-offset-4 hover:underline"
                      onClick={() => {
                        const next = [...rows];
                        next[idx] = {
                          ...next[idx]!,
                          segments: next[idx]!.segments.filter((_, j) => j !== si),
                        };
                        setRows(next);
                      }}
                    >
                      Retirer la plage
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={btnGhostClass + " min-h-9 py-2 text-xs"}
                  onClick={() => {
                    const next = [...rows];
                    next[idx] = {
                      ...next[idx]!,
                      segments: [...next[idx]!.segments, { start: "14:00", end: "18:00" }],
                    };
                    setRows(next);
                  }}
                >
                  + Plage horaire
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <button type="button" className={`${btnPrimaryClass} mt-8`} onClick={() => onSave(rows)}>
        Enregistrer les créneaux personnalisés
      </button>
    </section>
  );
}
