"use client";

import { useState } from "react";
import { ui } from "@/lib/design/tokens";
import {
  buildWhatsappInviteMessage,
  buildWhatsappShareUrl,
} from "@/lib/pronoclash/league-utils";

export function InviteCard({
  leagueName,
  inviteUrl,
}: {
  leagueName: string;
  inviteUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const message = buildWhatsappInviteMessage({ leagueName, inviteUrl });
  const waUrl = buildWhatsappShareUrl(message);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`${ui.glassCard} space-y-5 p-6 sm:p-8`}>
      <div>
        <p className={ui.label}>Lien d&apos;invitation</p>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
          <input
            type="text"
            value={inviteUrl}
            readOnly
            className="flex-1 bg-transparent text-sm text-white outline-none"
          />
          <button
            type="button"
            onClick={copy}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
          >
            {copied ? "Copié ✓" : "Copier"}
          </button>
        </div>
      </div>

      <div>
        <p className={ui.label}>Message prérempli WhatsApp</p>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white/85">
          {message}
        </pre>
      </div>

      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-4 text-base font-semibold text-white shadow-[0_15px_40px_-15px_rgba(16,185,129,0.7)] transition hover:scale-[1.02]`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.5 3.5A11 11 0 0 0 3.6 17l-1.6 5 5.1-1.5A11 11 0 0 0 20.5 3.5Z"/>
        </svg>
        Ouvrir WhatsApp
      </a>

      <p className="text-center text-xs text-white/40">
        Tout joueur avec ce lien peut rejoindre. Ne le partage qu&apos;à tes potes.
      </p>
    </div>
  );
}
