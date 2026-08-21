"use client";

import { useEffect, useState } from "react";
import { ui } from "@/lib/design/tokens";

export function PersonalSecuritySettings() {
  const [hasPin, setHasPin] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [pin, setPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await fetch("/api/personal/security");
    const data = await res.json();
    if (res.ok) {
      setHasPin(Boolean(data.hasPin));
      setLockEnabled(Boolean(data.lockEnabled));
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const save = async (payload: Record<string, unknown>) => {
    setLoading(true);
    setMsg(null);
    setError(null);
    const res = await fetch("/api/personal/security", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    setHasPin(Boolean(data.hasPin));
    setLockEnabled(Boolean(data.lockEnabled));
    setPin("");
    setCurrentPin("");
    setMsg("Paramètres de verrouillage enregistrés.");
  };

  return (
    <section className={`${ui.card} space-y-4 p-5 sm:p-6`}>
      <div>
        <h2 className={ui.h2}>Verrouillage Personnel</h2>
        <p className="mt-1 text-sm text-[#8b869c]">
          PIN secondaire pour l&apos;espace Personnel. Vous restez connecté à WaveOne. Le PIN n&apos;est jamais
          stocké en clair.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-[#e8e4f0]">
        <input
          type="checkbox"
          checked={lockEnabled}
          onChange={(e) => {
            if (e.target.checked && !hasPin) {
              setError("Définissez un PIN d'abord.");
              return;
            }
            void save({
              lock_enabled: e.target.checked,
              current_pin: currentPin || undefined,
            });
          }}
        />
        Activer le verrouillage de l&apos;espace Personnel
      </label>

      {hasPin ? (
        <div>
          <label className={ui.label}>PIN actuel</label>
          <input
            className={ui.input}
            type="password"
            inputMode="numeric"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="Requis pour modifier"
          />
        </div>
      ) : null}

      <div>
        <label className={ui.label}>{hasPin ? "Nouveau PIN" : "Définir un PIN"}</label>
        <input
          className={ui.input}
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          placeholder="4 à 8 chiffres"
        />
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {msg ? <p className={ui.alertInfo}>{msg}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={ui.btnPrimary}
          disabled={loading || pin.length < 4}
          onClick={() =>
            void save({
              pin,
              current_pin: currentPin || undefined,
              lock_enabled: true,
            })
          }
        >
          {hasPin ? "Modifier le PIN" : "Enregistrer le PIN"}
        </button>
        {hasPin ? (
          <button
            type="button"
            className={ui.btnGhost}
            disabled={loading}
            onClick={() => void save({ clear_pin: true, current_pin: currentPin, lock_enabled: false })}
          >
            Supprimer le PIN
          </button>
        ) : null}
      </div>
    </section>
  );
}
