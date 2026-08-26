"use client";

import { useRef, useState } from "react";
import { ui } from "@/lib/design/tokens";
import type { Project } from "@/lib/projects/types";
import { fileToProjectLogo, looksLikeProjectLogo } from "@/lib/projects/logo";
import { ProjectAvatar } from "@/components/projects/ProjectAvatar";
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [logoUrl, setLogoUrl] = useState(
    project?.logo_url || (looksLikeProjectLogo(project?.icon) ? project?.icon ?? "" : "") || ""
  );
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

  const onLogoFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    try {
      setLogoUrl(await fileToProjectLogo(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de lire le logo");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload = {
      name,
      description,
      logo_url: logoUrl.trim() || null,
      modules,
      template,
    };
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

  const preview = { name: name || "Projet", logo_url: logoUrl || null, icon: project?.icon ?? null };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className={ui.overlay} onClick={onClose} aria-label="Fermer" />
      <form
        onSubmit={submit}
        className={`${ui.modal} relative z-10 flex max-h-[min(90vh,760px)] w-full max-w-lg flex-col overflow-hidden`}
      >
        <div className="shrink-0 px-6 pt-6">
          <h2 className="text-lg font-semibold text-wo-text">
            {project ? "Modifier le projet" : "Nouveau projet"}
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          <div className="space-y-4">
            <div>
              <label className={ui.label}>Nom *</label>
              <input className={ui.input} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className={ui.label}>Description</label>
              <textarea
                className={`${ui.input} min-h-[64px] resize-y`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className={ui.label}>Logo</label>
              <div className="mt-2 flex items-center gap-3">
                <ProjectAvatar project={preview} size="lg" />
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void onLogoFile(e.target.files?.[0] ?? null)}
                  />
                  <button type="button" className={ui.btnSecondary} onClick={() => fileRef.current?.click()}>
                    {logoUrl ? "Changer le logo" : "Ajouter un logo"}
                  </button>
                  {logoUrl ? (
                    <button type="button" className={ui.btnGhost} onClick={() => setLogoUrl("")}>
                      Retirer
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-1.5 text-[12px] text-wo-muted">PNG, JPG ou WebP. Affiché dans la sidebar et les listes.</p>
            </div>

            {!project ? (
              <div>
                <label className={ui.label}>Template</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {PROJECT_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t.id)}
                      className={`rounded-[12px] border px-3 py-2 text-left ${
                        template === t.id
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-wo-border hover:bg-wo-hover"
                      }`}
                    >
                      <p className="text-sm font-medium text-wo-text">{t.label}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-wo-muted">{t.description}</p>
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
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-wo-border bg-white px-6 py-4">
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
