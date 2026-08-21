"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconLock } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";

export function PersonalLockScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (value = pin) => {
    if (value.length < 4) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/personal/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: value }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "PIN incorrect.");
      setPin("");
      return;
    }
    router.refresh();
  };

  const append = (digit: string) => {
    const next = (pin + digit).slice(0, 8);
    setPin(next);
    setError(null);
    if (next.length >= 4 && next.length >= pin.length) {
      /* wait for 4+ then user confirms, or auto at 6 */
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-4">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-200 shadow-[0_0_32px_rgba(16,185,129,0.28)]">
        <IconLock className="h-6 w-6" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-semibold text-[#eef6f2]">Espace Personnel</h1>
      <p className="mt-2 text-center text-sm text-[#8a9e96]">
        Entrez votre PIN pour ouvrir cet espace. Cela ne vous déconnecte pas de WaveOne.
      </p>

      <div className="mt-6 flex gap-2">
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <span
            key={i}
            className={`h-3 w-3 rounded-full ${i < pin.length ? "bg-emerald-400" : "bg-white/15"}`}
          />
        ))}
      </div>

      <input
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
        onKeyDown={(e) => {
          if (e.key === "Enter") void submit();
        }}
        className={`${ui.input} mt-5 text-center tracking-[0.4em]`}
        placeholder="••••"
        autoFocus
      />

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

      <div className="mt-5 grid w-full grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) =>
          key === "" ? (
            <span key="empty" />
          ) : (
            <button
              key={key}
              type="button"
              className="rounded-2xl border border-white/[0.06] bg-white/[0.03] py-3 text-lg font-medium text-[#eef6f2] transition hover:border-emerald-400/20 hover:bg-white/[0.07]"
              onClick={() => {
                if (key === "⌫") setPin((v) => v.slice(0, -1));
                else append(key);
              }}
            >
              {key}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        className={`${ui.btnPrimary} mt-5 w-full`}
        disabled={loading || pin.length < 4}
        onClick={() => void submit()}
      >
        {loading ? "Vérification…" : "Déverrouiller"}
      </button>
    </div>
  );
}
