"use client";

import { useEffect, useState } from "react";
import { ui } from "@/lib/design/tokens";
import type { CrmSettings } from "@/lib/crm/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<CrmSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        delay_relance_1_days: settings.delay_relance_1_days,
        delay_relance_2_days: settings.delay_relance_2_days,
        delay_relance_3_days: settings.delay_relance_3_days,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMsg(data.error ?? "Erreur");
      return;
    }
    setSettings(data.settings);
    setMsg("Paramètres enregistrés.");
  };

  if (!settings) {
    return <p className="text-sm text-slate-400">Chargement…</p>;
  }

  const fields = [
    {
      key: "delay_relance_1_days" as const,
      label: "Délai avant Relance 1",
      hint: "Jours après le premier contact (mail / appel).",
    },
    {
      key: "delay_relance_2_days" as const,
      label: "Délai avant Relance 2",
      hint: "Jours après la Relance 1.",
    },
    {
      key: "delay_relance_3_days" as const,
      label: "Délai avant Relance 3",
      hint: "Jours après la Relance 2.",
    },
  ];

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="crm-animate-in">
        <h1 className={ui.h1}>Paramètres</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ces délais programment automatiquement vos prochaines relances.
        </p>
      </div>

      <form onSubmit={save} className={`${ui.card} space-y-5 p-5 sm:p-6 crm-animate-in-delay-1`}>
        {fields.map((f) => (
          <div key={f.key}>
            <label className={ui.label} htmlFor={f.key}>
              {f.label}
            </label>
            <div className="flex items-center gap-2">
              <input
                id={f.key}
                type="number"
                min={1}
                max={90}
                className={`${ui.input} w-28`}
                value={settings[f.key]}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    [f.key]: Number(e.target.value),
                  })
                }
              />
              <span className="text-sm text-slate-400">jours</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{f.hint}</p>
          </div>
        ))}

        {msg ? (
          <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            {msg}
          </p>
        ) : null}

        <button type="submit" className={ui.btnPrimary} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
