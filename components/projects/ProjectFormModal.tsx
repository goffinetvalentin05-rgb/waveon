"use client";

import { useState } from "react";
import { ui } from "@/lib/design/tokens";
import { PROJECT_COLORS } from "@/lib/projects/types";
import type { Project } from "@/lib/projects/types";

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload = { name, description, icon, color };
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
      <form onSubmit={submit} className={`${ui.modal} max-w-md p-6`}>
        <h2 className="text-lg font-semibold text-[#f3f0fa]">
          {project ? "Modifier le projet" : "Nouveau projet"}
        </h2>
        <div className="mt-5 space-y-3">
          <div>
            <label className={ui.label}>Nom *</label>
            <input className={ui.input} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className={ui.label}>Description</label>
            <textarea
              className={`${ui.input} min-h-[88px] resize-y`}
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
                    color === c ? "border-white ring-2 ring-white/30" : "border-transparent"
                  }`}
                  style={{ background: c }}
                  aria-label={c}
                />
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
