"use client";

import { useEffect } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
};

export function Modal({ open, title, description, children, footer, onClose }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-neutral-950/25 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="wavon-modal-panel relative z-[81] max-h-[min(92vh,720px)] w-full max-w-lg overflow-y-auto rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.12)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-950">{title}</h2>
            {description ? (
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-200/90 px-2.5 py-1 text-xs font-medium text-neutral-500 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-950"
          >
            Fermer
          </button>
        </div>
        <div className="mt-6">{children}</div>
        {footer ? (
          <div className="mt-8 flex flex-wrap justify-end gap-2 border-t border-neutral-100 pt-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
