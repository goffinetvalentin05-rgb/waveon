"use client";

import { useState } from "react";
import { ui } from "@/lib/design/tokens";
import { PROJECT_COLORS } from "@/lib/projects/types";
import type { Project } from "@/lib/projects/types";
import {
  PROJECT_MODULE_LABELS,
  SELECTABLE_MODULE_KEYS,
  PROJECT_TEMPLATES,
  normalizeModules,
  type ProjectModuleKey,
  type ProjectTemplateId,
} from "@/lib/projects/modules";

export function ProjectFormModal({
  project,
  onClose,
  onSaved,
}: {
  project?: Project | null;
  onClose: () => void;
  onSaved: (project: Project) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [icon, setIcon] = useState(project?.icon ?? "");
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0]);
  const [template, setTemplate] = useState<ProjectTemplateId>(project ? "custom" : "commercial");
  const [modules, setModules] = useState<ProjectModuleKey[]>(
    normalizeModules(project?.enabledModules ?? PROJECT_TEMPLATES.find((t) => t.id === "commercial")?.modules)
  );

  const applyTemplate = (id: ProjectTemplateId) => {
    setTemplate(id);
    const found = PROJECT_TEMPLATES.find((t) => t.id === id);
    if (found && id !== "custom") setModules(normalizeModules(found.modules));
  };

  const toggleModule = (key: ProjectModuleKey) => {
    if (key === "overview") return;
    setTemplate("custom");
    setModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : normalizeModules([...prev, key])
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload = { name, description, icon, color, modules, template };
    const res = await fetch(project ? `/api/projects/${project.id}` : "/api/projects", {
      method: project ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    onSaved(data.project);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className={ui.overlay} onClick={onClose} />
      <form onSubmit={submit} className={`${ui.modal} max-h-[90vh] max-w-lg overflow-y-auto p-6`}>
        <h2 className="text-lg font-semibold text-wo-text">
          {project ? "Modifier le projet" : "Nouveau projet"}
        </h2>
        <div className="mt-5 space-y-4">
          <div>
            <label className={ui.label}>Nom *</label>
            <input className={ui.input} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className={ui.label}>Description</label>
            <textarea
              className={`${ui.input} min-h-[72px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className={ui.label}>Icône / emoji</label>
            <input
              className={ui.input}
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="💼"
            />
          </div>
          <div>
            <label className={ui.label}>Couleur</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border ${
                    color === c ? "border-slate-900 ring-2 ring-indigo-200" : "border-transparent"
                  }`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {!project ? (
            <div>
              <label className={ui.label}>Template</label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {PROJECT_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t.id)}
                    className={`rounded-[12px] border px-3 py-2.5 text-left ${
                      template === t.id
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-wo-border hover:bg-wo-hover"
                    }`}
                  >
                    <p className="text-sm font-medium text-wo-text">{t.label}</p>
                    <p className="mt-0.5 text-[11px] text-wo-muted">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <label className={ui.label}>Modules</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {SELECTABLE_MODULE_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-[10px] border border-wo-border px-3 py-2 text-sm text-wo-text"
                >
                  <input
                    type="checkbox"
                    checked={modules.includes(key)}
                    disabled={key === "overview"}
                    onChange={() => toggleModule(key)}
                  />
                  {PROJECT_MODULE_LABELS[key]}
                </label>
              ))}
            </div>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className={ui.btnPrimary} disabled={loading}>
            {loading ? "Enregistrement…" : project ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}
