"use client";

import { ui } from "@/lib/design/tokens";

export function ConfirmModal({
  open,
  title,
  description,
  tone = "default",
  confirmLabel,
  cancelLabel = "Annuler",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  tone?: "default" | "danger";
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className={ui.overlay} onClick={onCancel} aria-label="Fermer" />
      <div className={`${ui.modal} max-w-lg p-6`}>
        <h3 className="font-display text-lg font-semibold text-wo-text">{title}</h3>
        {description ? (
          <p className="mt-2 whitespace-pre-line text-sm text-wo-muted">{description}</p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === "danger" ? ui.btnDanger : ui.btnPrimary}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.35rem] border border-dashed border-wo-border bg-white px-6 py-12 text-center">
      <p className="text-sm font-medium text-wo-text">{title}</p>
      {description ? <p className="mt-1 text-sm text-wo-dim">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
