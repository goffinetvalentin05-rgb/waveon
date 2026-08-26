"use client";

import { useState } from "react";
import { ui } from "@/lib/design/tokens";

export function DeleteProjectModal({
  projectName,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  projectName: string;
  loading?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (typedName: string) => void;
}) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === projectName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className={ui.overlay} onClick={loading ? undefined : onCancel} aria-label="Fermer" />
      <div className={`${ui.modal} max-w-lg p-6`}>
        <h3 className="font-display text-lg font-semibold text-wo-text">Supprimer {projectName} ?</h3>
        <p className="mt-2 text-sm text-wo-muted">
          Cette action supprimera définitivement le projet ainsi que ses données associées (prospects, tâches,
          notes, contenu, documents, invitations). Les espaces Personnel des membres et leurs autres projets
          restent intacts.
        </p>
        <div className="mt-5">
          <label className={ui.label}>Pour confirmer, saisissez {projectName}</label>
          <input
            className={ui.input}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={projectName}
            disabled={loading}
            autoFocus
          />
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onCancel} disabled={loading}>
            Annuler
          </button>
          <button
            type="button"
            className={ui.btnDanger}
            disabled={!matches || loading}
            onClick={() => onConfirm(typed.trim())}
          >
            {loading ? "Suppression…" : "Supprimer définitivement"}
          </button>
        </div>
      </div>
    </div>
  );
}
