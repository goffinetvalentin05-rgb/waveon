"use client";

import { useState } from "react";
import { ui } from "@/lib/design/tokens";
import { CONTACT_CHANNELS } from "@/lib/crm/types";

export function InteractionForm({
  prospectId,
  defaultChannel,
  onAdded,
}: {
  prospectId: string;
  defaultChannel?: string | null;
  onAdded: () => void;
}) {
  const channelOptions =
    defaultChannel && !(CONTACT_CHANNELS as readonly string[]).includes(defaultChannel)
      ? [defaultChannel, ...CONTACT_CHANNELS]
      : [...CONTACT_CHANNELS];
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState(defaultChannel?.trim() || "Email");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/prospects/${prospectId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        occurred_at: date,
        description,
        channel,
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
        <select className={ui.input} value={channel} onChange={(e) => setChannel(e.target.value)}>
          {channelOptions.map((c) => (
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
      <div className="sm:col-span-2">
        <label className={ui.label}>Description</label>
        <input
          className={ui.input}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex. Appel sans réponse."
        />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <button type="submit" className={ui.btnSecondary} disabled={saving}>
          {saving ? "…" : "Ajouter l'interaction"}
        </button>
      </div>
    </form>
  );
}
