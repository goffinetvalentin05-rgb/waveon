"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/design/tokens";

export default function JoinLeaguePage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) return;
    router.push(`/leagues/join/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-semibold text-white">Rejoindre une ligue</h1>
      <p className="mt-2 text-sm text-white/55">
        Entre le code d&apos;invitation reçu sur WhatsApp. Rejoindre une ligue privée est
        gratuit — seule la création est payante.
      </p>
      <form onSubmit={submit} className={`${ui.glassCard} mt-6 p-6`}>
        <label className={ui.label} htmlFor="invite-code">
          Code d&apos;invitation
        </label>
        <input
          id="invite-code"
          type="text"
          className={`${ui.input} mt-2 uppercase tracking-widest`}
          placeholder="Ex. AB12CD34"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={12}
          autoFocus
        />
        <button type="submit" className={`${ui.btnPrimary} mt-6 w-full`} disabled={code.trim().length < 4}>
          Rejoindre la ligue
        </button>
      </form>
    </div>
  );
}
