"use client";

import { useState } from "react";
import { ui } from "@/lib/design/tokens";
import { INTERACTION_LABELS, INTERACTION_TYPES, type InteractionType } from "@/lib/crm/types";

export function InteractionForm({
  prospectId,
  onAdded,
}: {
  prospectId: string;
  onAdded: () => void;
}) {
  const [type, setType] = useState<InteractionType>("whatsapp");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/prospects/${prospectId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action_type: type,
        occurred_at: date,
        description,
      }),
    });
    setSaving(false);
    setDescription("");
    onAdded();
  };

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
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
        <label className={ui.label}>Date</label>
        <input type="date" className={ui.input} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className={ui.label}>Description</label>
        <input
          className={ui.input}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex. Relance envoyée"
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
