"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconChevronRight, IconUsersGroup } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import type { CrmSettings } from "@/lib/crm/types";
import type { Project } from "@/lib/projects/types";
import { PeopleManager } from "@/components/people/PeopleManager";
import { PersonalSecuritySettings } from "@/components/settings/PersonalSecuritySettings";
import { ProjectAvatar } from "@/components/projects/ProjectAvatar";

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/preferences").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]).then(([s, p, pr]) => {
      setSettings(s.settings);
      if (p.preferences?.timezone) setTimezone(p.preferences.timezone);
      setProjects(((pr.projects ?? []) as Project[]).filter((item) => item.status === "active"));
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
    return <p className="text-sm text-wo-dim">Chargement…</p>;
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
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="space-y-3">
        <div>
          <p className={ui.kicker}>Compte</p>
          <h2 className={`${ui.h2} mt-1`}>Sécurité</h2>
        </div>
        <PersonalSecuritySettings />
      </section>

      <section className="space-y-3">
        <div>
          <p className={ui.kicker}>Projet</p>
          <h2 className={`${ui.h2} mt-1`}>Espaces de prospection</h2>
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-wo-muted">Aucun projet actif.</p>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}/settings`}
                className={`${ui.cardInteractive} flex items-center gap-3 p-4`}
              >
                <ProjectAvatar project={project} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-wo-text">{project.name}</span>
                  <span className="block text-[12px] text-wo-dim">Paramètres, identité et accès</span>
                </span>
                <IconChevronRight className="h-4 w-4 shrink-0 text-wo-dim" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <p className={ui.kicker}>Membres</p>
          <h2 className={`${ui.h2} mt-1`}>Équipe et carnet</h2>
        </div>
        {projects.length > 0 ? (
          <div className="space-y-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}/members`}
                className={`${ui.cardInteractive} flex items-center gap-3 p-4`}
              >
                <span className={ui.tile}>
                  <IconUsersGroup className="h-[18px] w-[18px]" stroke={1.7} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-wo-text">{project.name}</span>
                  <span className="block text-[12px] text-wo-dim">Inviter et gérer les membres</span>
                </span>
                <IconChevronRight className="h-4 w-4 shrink-0 text-wo-dim" />
              </Link>
            ))}
          </div>
        ) : null}
        <PeopleManager />
      </section>

      <section className="space-y-3">
        <div>
          <p className={ui.kicker}>Préférences</p>
          <h2 className={`${ui.h2} mt-1`}>Relances et fuseau</h2>
        </div>
        <form onSubmit={save} className={`${ui.card} space-y-5 p-5 sm:p-6`}>
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
                <span className="text-sm text-wo-muted">jours</span>
              </div>
              <p className="mt-1 text-xs text-wo-dim">{f.hint}</p>
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
            <p className="mt-1 text-xs text-wo-dim">
              Utilisé pour les rappels d&apos;anniversaire par email.
            </p>
          </div>

          {msg ? <p className={ui.alertInfo}>{msg}</p> : null}

          <button type="submit" className={ui.btnPrimary} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </section>
    </div>
  );
}
