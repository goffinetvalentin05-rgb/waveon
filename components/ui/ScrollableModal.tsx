"use client";

import { useEffect, type ReactNode } from "react";
import { ui } from "@/lib/design/tokens";

/** Bloque le scroll du body pendant qu'une modale est ouverte. */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

type ScrollableModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
  /** max-w-* Tailwind class, défaut max-w-lg */
  maxWidthClass?: string;
  asForm?: boolean;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
};

/**
 * Modale desktop + feuille mobile scrollable :
 * header sticky · contenu overflow · footer sticky (safe-area iOS).
 */
export function ScrollableModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidthClass = "max-w-lg",
  asForm = false,
  onSubmit,
}: ScrollableModalProps) {
  useLockBodyScroll(open);
  if (!open) return null;

  const shellClass = `${ui.modal} relative z-10 flex w-full ${maxWidthClass} flex-col overflow-hidden max-h-[min(92dvh,920px)] sm:max-h-[min(90vh,920px)]`;

  const inner = (
    <>
      <div className="shrink-0 border-b border-wo-border px-5 pb-3 pt-5 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-wo-text">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-wo-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="shrink-0 rounded-xl p-2 text-wo-muted hover:bg-wo-hover hover:text-wo-secondary"
            onClick={onClose}
            aria-label="Fermer"
          >
            <span className="block text-lg leading-none">×</span>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
        {children}
      </div>

      <div className="shrink-0 border-t border-wo-border bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
        {footer}
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button type="button" className={ui.overlay} onClick={onClose} aria-label="Fermer" />
      {asForm ? (
        <form onSubmit={onSubmit} className={`${shellClass} rounded-b-none sm:rounded-[18px]`}>
          {inner}
        </form>
      ) : (
        <div className={`${shellClass} rounded-b-none sm:rounded-[18px]`}>{inner}</div>
      )}
    </div>
  );
}
