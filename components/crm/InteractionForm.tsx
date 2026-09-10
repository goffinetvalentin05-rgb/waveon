"use client";

import { useState } from "react";
import { ui } from "@/lib/design/tokens";
import { crmToday } from "@/lib/crm/date-only";
import {
  INTERACTION_CHANNEL_LABELS,
  INTERACTION_CHANNELS,
  INTERACTION_KIND_LABELS,
  INTERACTION_KINDS,
  normalizeInteractionChannel,
  type InteractionChannel,
  type InteractionKind,
} from "@/lib/crm/interactions";

export function InteractionForm({
  prospectId,
  defaultChannel,
  onAdded,
}: {
  prospectId: string;
  defaultChannel?: string | null;
  onAdded: () => void;
}) {
  const [date, setDate] = useState(crmToday());
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState<InteractionChannel>(
    () => normalizeInteractionChannel(defaultChannel) ?? "email"
  );
  const [kind, setKind] = useState<InteractionKind>("other");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    await fetch(`/api/prospects/${prospectId}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        occurred_at: date,
        description,
        channel,
        interaction_type: kind,
      }),
    });
    setSaving(false);
    setDescription("");
    onAdded();
  };

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div>
        <label className={ui.label}>Canal</label>
        <select
          className={ui.input}
          value={channel}
          onChange={(e) => setChannel(e.target.value as InteractionChannel)}
        >
          {INTERACTION_CHANNELS.map((c) => (
            <option key={c} value={c}>
              {INTERACTION_CHANNEL_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={ui.label}>Type</label>
        <select
          className={ui.input}
          value={kind}
          onChange={(e) => setKind(e.target.value as InteractionKind)}
        >
          {INTERACTION_KINDS.map((k) => (
            <option key={k} value={k}>
              {INTERACTION_KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={ui.label}>Date</label>
        <input type="date" className={ui.input} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className={ui.label}>Description facultative</label>
        <input
          className={ui.input}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex. Appel sans réponse."
        />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <button type="submit" className={ui.btnSecondary} disabled={saving}>
          {saving ? "Enregistrement…" : "Ajouter l'interaction"}
        </button>
      </div>
    </form>
  );
}
