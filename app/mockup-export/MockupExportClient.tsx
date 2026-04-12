"use client";

import { useCallback, useState } from "react";

const slots = [
  { time: "10:00", selected: false },
  { time: "10:30", selected: true },
  { time: "11:00", selected: false },
  { time: "14:00", selected: false },
] as const;

export function MockupExportClient() {
  const [showHelp, setShowHelp] = useState(true);

  const copySize = useCallback(async () => {
    try {
      await navigator.clipboard.writeText("390 × 844 px");
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-neutral-400 p-6 pb-16">
      {showHelp ? (
        <div className="max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 text-sm leading-relaxed text-neutral-700 shadow-lg">
          <p className="font-semibold text-neutral-900">Exporter l’écran pour ton mockup</p>
          <ol className="mt-4 list-decimal space-y-3 pl-5">
            <li>
              Clique sur <strong>Masquer l’aide</strong> ci-dessous (tu verras seulement le téléphone blanc).
            </li>
            <li>
              <strong>Windows</strong> : <kbd className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">Win+Shift+S</kbd> puis trace un rectangle <em>uniquement</em> autour du bloc blanc arrondi (390×844).
            </li>
            <li>
              <strong>Chrome / Edge</strong> : clic droit sur le bloc blanc → <strong>Inspecter</strong> → dans l’onglet Éléments, clic droit sur la balise surlignée <code className="rounded bg-neutral-100 px-1 text-xs">#export-screen</code> → <strong>Capture node screenshot</strong> / « Capture d’écran du nœud ».
            </li>
          </ol>
          <p className="mt-4 text-xs text-neutral-500">
            Taille du canevas : 390×844 px (logique iPhone).{" "}
            <button
              type="button"
              onClick={copySize}
              className="text-neutral-800 underline decoration-neutral-400 underline-offset-2 hover:decoration-neutral-800"
            >
              Copier « 390 × 844 »
            </button>
          </p>
          <button
            type="button"
            onClick={() => setShowHelp(false)}
            className="mt-5 w-full rounded-xl bg-neutral-950 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Masquer l’aide
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="fixed right-4 top-4 z-50 rounded-lg border border-neutral-300 bg-white/95 px-3 py-2 text-xs font-medium text-neutral-700 shadow-md backdrop-blur hover:bg-white"
        >
          Afficher l’aide
        </button>
      )}

      {/* Zone à capturer — id pour l’inspecteur */}
      <div
        id="export-screen"
        className="flex h-[844px] w-[390px] shrink-0 flex-col rounded-[44px] bg-white px-6 pb-8 pt-[5.75rem] text-center text-neutral-950 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06),inset_0_18px_40px_-12px_rgba(255,255,255,0.65),inset_0_-10px_28px_-14px_rgba(0,0,0,0.07),0_24px_64px_rgba(0,0,0,0.2)] ring-1 ring-black/[0.04]"
      >
        <header className="shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">Réserver</p>
        </header>

        <div className="mt-4 shrink-0">
          <p className="font-display text-[1.05rem] font-normal leading-[1.2] tracking-[-0.02em]">Coupe + barbe</p>
          <p className="mt-1 text-[12px] leading-none text-neutral-500">45 min</p>
        </div>

        <div className="mt-5 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">Créneaux</p>
          <div className="mt-2.5 grid grid-cols-2 gap-3">
            {slots.map(({ time, selected }) => (
              <span
                key={time}
                className={`rounded-2xl px-1 py-2.5 text-center text-[13px] font-semibold tabular-nums leading-none ${
                  selected
                    ? "bg-neutral-950 text-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.35)]"
                    : "border border-neutral-200 bg-neutral-50/80 text-neutral-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                }`}
              >
                {time}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-7 shrink-0">
          <div className="w-full rounded-2xl bg-neutral-950 py-3 text-[15px] font-semibold leading-none tracking-tight text-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.25)]">
            Réserver
          </div>
        </div>
      </div>
    </div>
  );
}
