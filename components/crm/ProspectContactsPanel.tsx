"use client";

import { useCallback, useEffect, useState } from "react";
import { IconPlus, IconStar, IconTrash } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { contactDisplayName, type ProspectContact } from "@/lib/crm/contacts";

export function ProspectContactsPanel({
  prospectId,
  onChanged,
}: {
  prospectId: string;
  onChanged?: () => void;
}) {
  const [contacts, setContacts] = useState<ProspectContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/prospects/${prospectId}/contacts`);
    const data = await res.json();
    if (res.ok) setContacts(data.contacts ?? []);
    setLoading(false);
  }, [prospectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const setPrimary = async (id: string) => {
    await fetch(`/api/prospects/${prospectId}/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_primary: true }),
    });
    await load();
    onChanged?.();
  };

  const remove = async (id: string) => {
    await fetch(`/api/prospects/${prospectId}/contacts/${id}`, { method: "DELETE" });
    await load();
    onChanged?.();
  };

  return (
    <section className={`${ui.card} p-5 sm:p-6`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className={ui.h2}>Contacts</h2>
          <p className="mt-0.5 text-sm text-wo-muted">Personnes rattachées à ce prospect.</p>
        </div>
        <button type="button" className={ui.btnSecondary} onClick={() => setShowForm(true)}>
          <IconPlus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-wo-dim">Chargement…</p>
      ) : contacts.length === 0 ? (
        <p className="mt-4 text-sm text-wo-muted">Aucun contact. Ajoutez un interlocuteur.</p>
      ) : (
        <ul className="mt-4 divide-y divide-wo-border">
          {contacts.map((c) => (
            <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-wo-text">
                  {contactDisplayName(c)}
                  {c.is_primary ? (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                      <IconStar className="h-3 w-3" /> Principal
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-wo-muted">
                  {[c.job_title, c.email, c.phone].filter(Boolean).join(" · ") || "Coordonnées à compléter"}
                </p>
                {c.linkedin_url ? (
                  <a
                    href={c.linkedin_url.startsWith("http") ? c.linkedin_url : `https://${c.linkedin_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs text-wo-accent hover:underline"
                  >
                    LinkedIn
                  </a>
                ) : null}
              </div>
              <div className="flex gap-1">
                {!c.is_primary ? (
                  <button type="button" className={ui.btnGhost} onClick={() => void setPrimary(c.id)}>
                    Principal
                  </button>
                ) : null}
                <button
                  type="button"
                  className={ui.iconBtn}
                  onClick={() => void remove(c.id)}
                  aria-label="Supprimer"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <ContactForm
          prospectId={prospectId}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            setError(null);
            void load();
            onChanged?.();
          }}
          onError={setError}
        />
      ) : null}
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}

function ContactForm({
  prospectId,
  onClose,
  onSaved,
  onError,
}: {
  prospectId: string;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/prospects/${prospectId}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: fd.get("first_name"),
        last_name: fd.get("last_name"),
        job_title: fd.get("job_title"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        linkedin_url: fd.get("linkedin_url"),
        is_primary: fd.get("is_primary") === "true",
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      onError(data.error ?? "Erreur");
      return;
    }
    onSaved();
  };

  return (
    <form onSubmit={submit} className="mt-5 grid gap-3 rounded-2xl border border-wo-border bg-slate-50/60 p-4 sm:grid-cols-2">
      {(
        [
          { name: "first_name", label: "Prénom *", required: true },
          { name: "last_name", label: "Nom", required: false },
          { name: "job_title", label: "Fonction", required: false },
          { name: "email", label: "Email", required: false },
          { name: "phone", label: "Téléphone", required: false },
          { name: "linkedin_url", label: "LinkedIn", required: false },
        ] as const
      ).map((field) => (
        <div key={field.name}>
          <label className={ui.label}>{field.label}</label>
          <input name={field.name} required={field.required} className={ui.input} />
        </div>
      ))}
      <label className="flex items-center gap-2 text-sm text-wo-secondary sm:col-span-2">
        <input type="checkbox" name="is_primary" value="true" className="h-4 w-4 rounded border-wo-border text-indigo-600" />
        Contact principal
      </label>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" className={ui.btnGhost} onClick={onClose}>
          Annuler
        </button>
        <button type="submit" className={ui.btnPrimary} disabled={loading}>
          {loading ? "Ajout…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
