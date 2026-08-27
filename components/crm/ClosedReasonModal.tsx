"use client";

import { useState } from "react";
import { ui } from "@/lib/design/tokens";
import { CLOSED_REASONS, type ClosedReason } from "@/lib/crm/closed";

export function ClosedReasonModal({
  open,
  clubName,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  clubName?: string;
  onConfirm: (reason: ClosedReason, note: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<ClosedReason | null>(null);
  const [note, setNote] = useState("");

  if (!open) return null;

  const reset = () => {
    setReason(null);
    setNote("");
  };

  const submit = () => {
    if (!reason) return;
    onConfirm(reason, note.trim());
    reset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className={ui.overlay} onClick={onCancel} aria-label="Fermer" />
      <div className={`${ui.modal} w-full max-w-sm p-5`}>
        <h3 className="font-display text-base font-semibold text-wo-text">Pourquoi ce prospect est-il fermé ?</h3>
        {clubName ? <p className="mt-1 text-sm text-wo-muted">{clubName}</p> : null}
        <div className="mt-4 grid gap-1.5">
          {CLOSED_REASONS.map((option) => {
            const selected = reason === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setReason(option)}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                  selected
                    ? "border-indigo-200 bg-indigo-50 text-wo-text"
                    : "border-wo-border bg-white text-wo-secondary hover:border-indigo-200 hover:bg-slate-50"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
        {reason === "Autre" ? (
          <div className="mt-3">
            <label className={ui.label}>Note (facultatif)</label>
            <input
              className={ui.input}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Précisez en quelques mots"
              maxLength={120}
            />
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className={ui.btnSecondary}
            onClick={() => {
              reset();
              onCancel();
            }}
          >
            Annuler
          </button>
          <button type="button" className={ui.btnPrimary} disabled={!reason} onClick={submit}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
