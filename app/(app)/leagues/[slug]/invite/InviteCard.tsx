"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/pronoclash/ui/GlassPanel";
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
    <GlassPanel glow="violet" className="pc-form-card pc-animate-in" style={{ marginTop: 16 }}>
      <div>
        <p className="pc-label">Lien d&apos;invitation</p>
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
            className="pc-btn ghost sm"
          >
            {copied ? "Copié ✓" : "Copier"}
          </button>
        </div>
      </div>

      <div>
        <p className="pc-label" style={{ marginTop: 16 }}>Message prérempli WhatsApp</p>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white/85">
          {message}
        </pre>
      </div>

      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        className="pc-btn accent-orange block lg"
        style={{ marginTop: 16 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.5 3.5A11 11 0 0 0 3.6 17l-1.6 5 5.1-1.5A11 11 0 0 0 20.5 3.5Z"/>
        </svg>
        Ouvrir WhatsApp
      </a>

      <p className="pc-footnote" style={{ marginTop: 12 }}>
        Tout joueur avec ce lien peut rejoindre. Ne le partage qu&apos;à tes potes.
      </p>
    </GlassPanel>
  );
}
