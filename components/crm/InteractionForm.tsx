"use client";

import { useState } from "react";
import { ui } from "@/lib/design/tokens";
import {
  CONTACT_CHANNELS,
  INTERACTION_LABELS,
  INTERACTION_TYPES,
  type InteractionType,
  type ProspectStatus,
} from "@/lib/crm/types";
import { followUpDateLabel, suggestedStatusAfterInteraction } from "@/lib/crm/next-action";
import { addDays, formatISO } from "date-fns";

export function InteractionForm({
  prospectId,
  currentStatus,
  defaultChannel,
  onAdded,
}: {
  prospectId: string;
  currentStatus: ProspectStatus;
  defaultChannel?: string | null;
  onAdded: () => void;
}) {
  const [type, setType] = useState<InteractionType>("whatsapp");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState(defaultChannel ?? "WhatsApp");
  const [nextDate, setNextDate] = useState(formatISO(addDays(new Date(), 3), { representation: "date" }));
  const [saving, setSaving] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ProspectStatus | null>(null);

  const suggested = suggestedStatusAfterInteraction(type, currentStatus);
  const dateLabel = followUpDateLabel(currentStatus);

  const submit = async (e: React.FormEvent, applyStatus: boolean) => {
    e.preventDefault();
    setSaving(true);
    const body: Record<string, unknown> = {
      action_type: type,
      occurred_at: date,
      description,
      channel,
      apply_status: applyStatus,
    };
    if (dateLabel) body.next_follow_up = nextDate;
    await fetch(`/api/prospects/${prospectId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setDescription("");
    setPendingStatus(null);
    onAdded();
  };

  const onSubmit = (e: React.FormEvent) => {
    if (suggested && suggested !== currentStatus) {
      e.preventDefault();
      setPendingStatus(suggested);
      return;
    }
    void submit(e, true);
  };

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div>
        <label className={ui.label}>Type</label>
        <select className={ui.input} value={type} onChange={(e) => setType(e.target.value as InteractionType)}>
          {INTERACTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {INTERACTION_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={ui.label}>Canal</label>
        <select className={ui.input} value={channel} onChange={(e) => setChannel(e.target.value)}>
          {CONTACT_CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={ui.label}>Date</label>
        <input type="date" className={ui.input} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {dateLabel ? (
        <div>
          <label className={ui.label}>{dateLabel}</label>
          <input type="date" className={ui.input} value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <label className={ui.label}>Description</label>
        <input
          className={ui.input}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex. Relance envoyée"
        />
      </div>
      {pendingStatus ? (
        <div className="sm:col-span-2 rounded-xl border border-wo-border bg-wo-hover p-3">
          <p className="text-sm text-wo-text">
            Passer le statut à <span className="font-medium text-wo-text">{pendingStatus}</span> ?
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className={ui.btnSecondary}
              disabled={saving}
              onClick={(e) => void submit(e, false)}
            >
              Non, garder {currentStatus}
            </button>
            <button type="button" className={ui.btnPrimary} disabled={saving} onClick={(e) => void submit(e, true)}>
              Oui, mettre à jour
            </button>
          </div>
        </div>
      ) : (
        <div className="sm:col-span-2 flex justify-end">
          <button type="submit" className={ui.btnSecondary} disabled={saving}>
            {saving ? "…" : "Ajouter l'interaction"}
          </button>
        </div>
      )}
    </form>
  );
}
