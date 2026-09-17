"use client";

import { useEffect, useState } from "react";
import { ScrollableModal } from "@/components/ui/ScrollableModal";
import { ui } from "@/lib/design/tokens";
import { crmToday } from "@/lib/crm/date-only";
import {
  DEMO_DURATION_OPTIONS,
  DEMO_REMINDER_PRESETS,
  formatDurationLabel,
  inferReminderPreset,
  isoToLocalDate,
  isoToLocalTime,
  parseDemoScheduleDescription,
  resolveReminderDate,
  shiftDateOnly,
  type DemoReminderPresetId,
} from "@/lib/crm/demo-schedule";
import type { Prospect, ProspectActivity } from "@/lib/crm/types";
import { isDemoScheduledStatus } from "@/lib/crm/closed";

export type ScheduleDemoPayload = {
  demo_date: string;
  demo_time: string;
  duration_min: number;
  reminder_preset: DemoReminderPresetId;
  reminder_date: string | null;
  note: string;
};

export function ScheduleDemoModal({
  open,
  prospect,
  lastDemoActivity,
  saving,
  onClose,
  onSave,
  onCancelDemo,
}: {
  open: boolean;
  prospect: Prospect;
  lastDemoActivity: ProspectActivity | null;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: ScheduleDemoPayload) => void;
  onCancelDemo?: () => void;
}) {
  if (!open) return null;
  return (
    <ScheduleDemoModalInner
      key={`${prospect.id}-${prospect.demo_at ?? "new"}`}
      prospect={prospect}
      lastDemoActivity={lastDemoActivity}
      saving={saving}
      onClose={onClose}
      onSave={onSave}
      onCancelDemo={onCancelDemo}
    />
  );
}

function ScheduleDemoModalInner({
  prospect,
  lastDemoActivity,
  saving,
  onClose,
  onSave,
  onCancelDemo,
}: {
  prospect: Prospect;
  lastDemoActivity: ProspectActivity | null;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: ScheduleDemoPayload) => void;
  onCancelDemo?: () => void;
}) {
  const parsed = parseDemoScheduleDescription(lastDemoActivity?.description ?? null);
  const initialDate = prospect.demo_at
    ? isoToLocalDate(prospect.demo_at)
    : parsed.demoAt
      ? isoToLocalDate(parsed.demoAt)
      : crmToday();
  const initialTime = prospect.demo_at
    ? isoToLocalTime(prospect.demo_at)
    : parsed.demoAt
      ? isoToLocalTime(parsed.demoAt)
      : "14:00";
  const editing = isDemoScheduledStatus(prospect.status);
  const initialReminder = parsed.reminderOn ?? (editing ? null : resolveReminderDate(initialDate, "2d"));
  const initialPreset = inferReminderPreset(initialDate, initialReminder);

  const [demoDate, setDemoDate] = useState(initialDate);
  const [demoTime, setDemoTime] = useState(initialTime);
  const [durationMin, setDurationMin] = useState(parsed.durationMin || 30);
  const [reminderPreset, setReminderPreset] = useState<DemoReminderPresetId>(initialPreset);
  const [reminderDate, setReminderDate] = useState(initialReminder ?? "");
  const [note, setNote] = useState(parsed.note ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/prospects/${prospect.id}/demo-schedule`);
      const data = await res.json().catch(() => null);
      if (cancelled || !res.ok || !data?.scheduled) return;
      setDemoDate(String(data.demo_date || initialDate));
      setDemoTime(String(data.demo_time || initialTime));
      setDurationMin(Number(data.duration_min || 30));
      setReminderPreset((data.reminder_preset as DemoReminderPresetId) || "none");
      setReminderDate(String(data.reminder_date || ""));
      if (typeof data.note === "string") setNote(data.note);
    })();
    return () => {
      cancelled = true;
    };
  }, [prospect.id, initialDate, initialTime]);

  const submit = () => {
    setError(null);
    if (!demoDate || !demoTime) {
      setError("Indiquez la date et l’heure de la démo.");
      return;
    }
    const resolvedReminder =
      reminderPreset === "none" ? null : reminderPreset === "custom" ? reminderDate || null : resolveReminderDate(demoDate, reminderPreset);
    if (reminderPreset !== "none" && !resolvedReminder) {
      setError("Indiquez la date du rappel.");
      return;
    }
    if (resolvedReminder && resolvedReminder >= demoDate) {
      setError("Le rappel doit être avant la date de la démo.");
      return;
    }
    onSave({
      demo_date: demoDate,
      demo_time: demoTime,
      duration_min: durationMin,
      reminder_preset: reminderPreset,
      reminder_date: resolvedReminder,
      note,
    });
  };

  return (
    <ScrollableModal
      open
      onClose={saving ? () => undefined : onClose}
      title="Planifier une démo"
      subtitle={prospect.club_name}
      maxWidthClass="w-full sm:max-w-md"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {editing && onCancelDemo ? (
            <button
              type="button"
              className={`${ui.btnGhost} min-h-11 text-rose-300 sm:min-h-0`}
              disabled={saving}
              onClick={onCancelDemo}
            >
              Annuler la démo
            </button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={`${ui.btnSecondary} min-h-11 sm:min-h-0`} onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="button" className={`${ui.btnPrimary} min-h-11 sm:min-h-0`} disabled={saving} onClick={submit}>
              {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Planifier la démo"}
            </button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={ui.label}>Date de la démo</label>
          <input
            type="date"
            className={`${ui.input} mt-1 min-h-11 sm:min-h-0`}
            value={demoDate}
            disabled={saving}
            onChange={(e) => setDemoDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={ui.label}>Heure</label>
          <input
            type="time"
            className={`${ui.input} mt-1 min-h-11 sm:min-h-0`}
            value={demoTime}
            disabled={saving}
            onChange={(e) => setDemoTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="mt-5">
        <p className={ui.label}>Durée</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEMO_DURATION_OPTIONS.map((value) => {
            const selected = durationMin === value;
            return (
              <button
                key={value}
                type="button"
                disabled={saving}
                onClick={() => setDurationMin(value)}
                className={`min-h-11 rounded-xl border px-3.5 text-sm transition sm:min-h-0 sm:py-2 ${
                  selected
                    ? "border-wo-accent/40 bg-wo-accent-soft font-medium text-wo-text"
                    : "border-wo-border bg-transparent text-wo-secondary hover:bg-wo-hover"
                }`}
              >
                {formatDurationLabel(value)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <p className={ui.label}>Quand souhaitez-vous préparer / envoyer le rappel au prospect ?</p>
        <p className="mt-1 text-xs text-wo-muted">
          Action interne : envoyer le lien, confirmer, préparer la démo. Ce n’est pas un envoi automatique.
        </p>
        <div className="mt-2 grid gap-2">
          {DEMO_REMINDER_PRESETS.map((option) => {
            const selected = reminderPreset === option.id;
            return (
              <label
                key={option.id}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-[15px] sm:min-h-0 sm:text-sm ${
                  selected ? "border-wo-accent/40 bg-wo-accent-soft text-wo-text" : "border-wo-border text-wo-text hover:bg-wo-hover"
                }`}
              >
                <input
                  type="radio"
                  name="demo-reminder"
                  className="h-4 w-4 accent-indigo-600"
                  checked={selected}
                  disabled={saving}
                  onChange={() => {
                    setReminderPreset(option.id);
                    if (option.id !== "none" && option.id !== "custom") {
                      const next = resolveReminderDate(demoDate, option.id);
                      if (next) setReminderDate(next);
                    }
                    if (option.id === "custom" && !reminderDate && demoDate) {
                      setReminderDate(shiftDateOnly(demoDate, -2));
                    }
                  }}
                />
                {option.label}
              </label>
            );
          })}
        </div>
        {reminderPreset === "custom" ? (
          <div className="mt-3">
            <label className={ui.label}>Date du rappel</label>
            <input
              type="date"
              className={`${ui.input} mt-1 min-h-11 sm:min-h-0`}
              value={reminderDate}
              max={demoDate || undefined}
              disabled={saving}
              onChange={(e) => setReminderDate(e.target.value)}
            />
          </div>
        ) : reminderPreset !== "none" && resolveReminderDate(demoDate, reminderPreset) ? (
          <p className="mt-2 text-xs text-wo-muted">
            Rappel prévu le {resolveReminderDate(demoDate, reminderPreset)!.split("-").reverse().join(".")}.
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <label className={ui.label}>Note / préparation</label>
        <textarea
          className={`${ui.input} mt-1 min-h-[88px] resize-y`}
          value={note}
          disabled={saving}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Envoyer le lien Teams et rappeler les modules cotisations + boutique."
        />
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
    </ScrollableModal>
  );
}
