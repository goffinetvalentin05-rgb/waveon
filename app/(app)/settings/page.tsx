"use client";

import { useEffect, useState } from "react";
import { ui } from "@/lib/design/tokens";
import type { CrmSettings } from "@/lib/crm/types";
import { PeopleManager } from "@/components/people/PeopleManager";
import { PersonalSecuritySettings } from "@/components/settings/PersonalSecuritySettings";

const TIMEZONES = [
  "Europe/Zurich",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/London",
  "UTC",
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<CrmSettings | null>(null);
  const [timezone, setTimezone] = useState("Europe/Zurich");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/preferences").then((r) => r.json()),
    ]).then(([s, p]) => {
      setSettings(s.settings);
      if (p.preferences?.timezone) setTimezone(p.preferences.timezone);
    });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMsg(null);

    const [resSettings, resPrefs] = await Promise.all([
      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delay_relance_1_days: settings.delay_relance_1_days,
          delay_relance_2_days: settings.delay_relance_2_days,
          delay_relance_3_days: settings.delay_relance_3_days,
        }),
      }),
      fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      }),
    ]);

    const data = await resSettings.json();
    setSaving(false);
    if (!resSettings.ok || !resPrefs.ok) {
      setMsg(data.error ?? "Erreur");
      return;
    }
    setSettings(data.settings);
    setMsg("Paramètres enregistrés.");
  };

  if (!settings) {
    return <p className="text-sm text-[#6a6578]">Chargement…</p>;
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
        <p className="mt-1 text-sm text-[#8b869c]">
          Relances CRM et fuseau horaire pour les rappels.
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
              <span className="text-sm text-[#8b869c]">jours</span>
            </div>
            <p className="mt-1 text-xs text-[#6a6578]">{f.hint}</p>
          </div>
        ))}

        <div>
          <label className={ui.label} htmlFor="timezone">
            Fuseau horaire
          </label>
          <select
            id="timezone"
            className={ui.input}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[#6a6578]">
            Utilisé pour les rappels d&apos;anniversaire par email.
          </p>
        </div>

        {msg ? (
          <p className={ui.alertInfo}>{msg}</p>
        ) : null}

        <button type="submit" className={ui.btnPrimary} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>

      <PersonalSecuritySettings />

      <PeopleManager />
    </div>
  );
}
