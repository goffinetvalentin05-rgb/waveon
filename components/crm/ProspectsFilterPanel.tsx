"use client";

import { ui } from "@/lib/design/tokens";
import type { ProspectListFilters, PresenceFilter } from "@/lib/crm/prospect-list-params";
import { CLOSED_REASONS } from "@/lib/crm/closed";

type FilterOptions = {
  sports: string[];
  cantons: string[];
  villes: string[];
  statuses: string[];
};

type Props = {
  open: boolean;
  draft: ProspectListFilters;
  options: FilterOptions;
  clientsOnly: boolean;
  onChange: (draft: ProspectListFilters) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

function MultiCheckboxGroup({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (values.length === 0) {
    return (
      <div>
        <p className={ui.label}>{label}</p>
        <p className="text-sm text-wo-dim">Aucune valeur disponible</p>
      </div>
    );
  }

  return (
    <div>
      <p className={ui.label}>{label}</p>
      <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto rounded-xl border border-wo-border p-2">
        {values.map((value) => {
          const checked = selected.includes(value);
          return (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-wo-secondary hover:bg-wo-hover"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(value)}
                className="rounded border-white/20 text-indigo-600 focus:ring-indigo-500/30"
              />
              <span className="truncate">{value}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function PresenceSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PresenceFilter | null;
  onChange: (value: PresenceFilter | null) => void;
}) {
  return (
    <div>
      <label className={ui.label}>{label}</label>
      <select
        className={ui.input}
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "yes" || v === "no" ? v : null);
        }}
      >
        <option value="">Tous</option>
        <option value="yes">Oui</option>
        <option value="no">Non</option>
      </select>
    </div>
  );
}

export function ProspectsFilterPanel({
  open,
  draft,
  options,
  clientsOnly,
  onChange,
  onApply,
  onReset,
  onClose,
}: Props) {
  if (!open) return null;

  const toggle = (key: "sports" | "cantons" | "villes" | "statuses" | "closedReasons", value: string) => {
    const current = draft[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...draft, [key]: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:items-center">
      <button
        type="button"
        className={ui.overlay}
        onClick={onClose}
        aria-label="Fermer"
      />
      <div className={`${ui.modal} max-h-[90vh] max-w-2xl overflow-y-auto p-6`}>
        <h2 className="text-lg font-semibold text-wo-text">Filtrer les prospects</h2>
        <p className="mt-1 text-sm text-wo-muted">
          Sélectionnez vos critères puis appliquez les filtres.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <MultiCheckboxGroup
            label="Secteur"
            values={options.sports}
            selected={draft.sports}
            onToggle={(v) => toggle("sports", v)}
          />
          <MultiCheckboxGroup
            label="Localisation"
            values={options.cantons}
            selected={draft.cantons}
            onToggle={(v) => toggle("cantons", v)}
          />
          <MultiCheckboxGroup
            label="Ville"
            values={options.villes}
            selected={draft.villes}
            onToggle={(v) => toggle("villes", v)}
          />
          {!clientsOnly ? (
            <MultiCheckboxGroup
              label="Statut"
              values={options.statuses}
              selected={draft.statuses}
              onToggle={(v) => toggle("statuses", v)}
            />
          ) : null}
          {!clientsOnly ? (
            <MultiCheckboxGroup
              label="Raison de fermeture"
              values={[...CLOSED_REASONS]}
              selected={draft.closedReasons}
              onToggle={(v) => toggle("closedReasons", v)}
            />
          ) : null}
          <PresenceSelect
            label="Présence d'un email"
            value={draft.hasEmail}
            onChange={(hasEmail) => onChange({ ...draft, hasEmail })}
          />
          <PresenceSelect
            label="Présence d'un téléphone"
            value={draft.hasPhone}
            onChange={(hasPhone) => onChange({ ...draft, hasPhone })}
          />
          <div>
            <p className={ui.label}>Archivage</p>
            <select
              className={ui.input}
              value={draft.archived}
              onChange={(e) =>
                onChange({
                  ...draft,
                  archived: e.target.value === "archived" ? "archived" : "active",
                })
              }
            >
              <option value="active">Actifs uniquement</option>
              <option value="archived">Archivés uniquement</option>
            </select>
          </div>
          <div>
            <p className={ui.label}>Date de prochaine action</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="date"
                className={ui.input}
                value={draft.nextFollowUpFrom}
                onChange={(e) => onChange({ ...draft, nextFollowUpFrom: e.target.value })}
              />
              <input
                type="date"
                className={ui.input}
                value={draft.nextFollowUpTo}
                onChange={(e) => onChange({ ...draft, nextFollowUpTo: e.target.value })}
              />
            </div>
          </div>
          <div>
            <p className={ui.label}>Date de dernière action</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="date"
                className={ui.input}
                value={draft.lastActionFrom}
                onChange={(e) => onChange({ ...draft, lastActionFrom: e.target.value })}
              />
              <input
                type="date"
                className={ui.input}
                value={draft.lastActionTo}
                onChange={(e) => onChange({ ...draft, lastActionTo: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onReset}>
            Réinitialiser
          </button>
          <button type="button" className={ui.btnSecondary} onClick={onClose}>
            Annuler
          </button>
          <button type="button" className={ui.btnPrimary} onClick={onApply}>
            Appliquer les filtres
          </button>
        </div>
      </div>
    </div>
  );
}
