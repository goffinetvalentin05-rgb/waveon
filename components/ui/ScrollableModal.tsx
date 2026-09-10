"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ui } from "@/lib/design/tokens";

/** Bloque le scroll de la page, pas celui du modal. */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    const scrollbar = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevPad;
    };
  }, [locked]);
}

function subscribeNoop() {
  return () => undefined;
}

function useIsClient() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
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
 * Modal via portal (évite les parents `transform` / overflow).
 * Desktop : centré, hauteur max viewport.
 * Mobile : feuille collée en bas, scroll interne, footer sticky.
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
  const mounted = useIsClient();
  useLockBodyScroll(Boolean(open && mounted));

  if (!open || !mounted) return null;

  const shellClass = [
    ui.modal,
    "relative z-10 flex w-full min-h-0 flex-col overflow-hidden",
    "max-h-[calc(100dvh-env(safe-area-inset-top,0px)-0.5rem)]",
    "sm:max-h-[calc(100dvh-2rem)]",
    "rounded-none !rounded-t-[1.25rem] !rounded-b-none sm:!rounded-[18px]",
    "max-w-[100vw]",
    maxWidthClass,
  ].join(" ");

  const inner = (
    <>
      <div className="shrink-0 border-b border-wo-border px-5 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-wo-text">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-wo-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-wo-muted hover:bg-wo-hover hover:text-wo-secondary sm:h-9 sm:w-9"
            onClick={onClose}
            aria-label="Fermer"
          >
            <span className="block text-lg leading-none">×</span>
          </button>
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-4 sm:px-6"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {children}
      </div>

      <div className="shrink-0 border-t border-wo-border bg-white px-5 py-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
        {footer}
      </div>
    </>
  );

  const node = (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center overflow-hidden overscroll-none p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button type="button" className={`${ui.overlay} !fixed`} onClick={onClose} aria-label="Fermer" />
      {asForm ? (
        <form onSubmit={onSubmit} className={shellClass}>
          {inner}
        </form>
      ) : (
        <div className={shellClass}>{inner}</div>
      )}
    </div>
  );

  return createPortal(node, document.body);
}
