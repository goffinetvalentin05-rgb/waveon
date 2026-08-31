"use client";

import type { ChangeEvent, ReactNode } from "react";
import { ui } from "@/lib/design/tokens";
import {
  CONTACT_CHANNELS,
  PROSPECT_PRIORITIES,
  type ProspectBusinessFormValues,
} from "@/lib/crm/prospect-fields";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  /** Requis en mode édition (contrôlé). */
  values?: ProspectBusinessFormValues;
  onChange?: (patch: Partial<ProspectBusinessFormValues>) => void;
  /** Affiche le champ logo (édition uniquement en pratique). */
  showLogo?: boolean;
};

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="col-span-full mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-wo-dim first:mt-0">
      {children}
    </p>
  );
}

function FieldShell({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className={ui.label}>{label}</label>
      {children}
    </div>
  );
}

/**
 * Champs métier prospect — même structure pour création et édition.
 * - create : inputs non contrôlés (`name`) pour FormData
 * - edit : valeurs contrôlées via `values` / `onChange`
 */
export function ProspectBusinessFields({ mode, values, onChange, showLogo = false }: Props) {
  const isEdit = mode === "edit";
  const v = values;

  const set = <K extends keyof ProspectBusinessFormValues>(key: K, value: ProspectBusinessFormValues[K]) => {
    onChange?.({ [key]: value } as Partial<ProspectBusinessFormValues>);
  };

  const textProps = (key: keyof ProspectBusinessFormValues, type: string = "text") =>
    isEdit
      ? {
          type,
          className: ui.input,
          value: v?.[key] ?? "",
          onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
            set(key, e.target.value as ProspectBusinessFormValues[typeof key]),
        }
      : {
          type,
          name: key,
          className: ui.input,
        };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SectionTitle>Informations</SectionTitle>
      <FieldShell label="Nom / entreprise *" className="sm:col-span-2">
        <input {...textProps("club_name")} required={mode === "create" || undefined} />
      </FieldShell>
      <FieldShell label="Secteur">
        <input {...textProps("sport")} />
      </FieldShell>
      <FieldShell label="Canton / région">
        <input {...textProps("canton")} />
      </FieldShell>
      <FieldShell label="Ville">
        <input {...textProps("ville")} />
      </FieldShell>
      <FieldShell label="Pays">
        <input {...textProps("country")} />
      </FieldShell>
      <FieldShell label="Adresse" className="sm:col-span-2">
        <input {...textProps("address")} />
      </FieldShell>

      <SectionTitle>Contact principal</SectionTitle>
      <FieldShell label="Nom du contact">
        <input {...textProps("contact_name")} autoComplete="name" />
      </FieldShell>
      <FieldShell label="Fonction du contact">
        <input {...textProps("contact_function")} />
      </FieldShell>
      <FieldShell label="Téléphone">
        <input {...textProps("phone", "tel")} autoComplete="tel" />
      </FieldShell>
      <FieldShell label="Email">
        <input {...textProps("email", "email")} autoComplete="email" />
      </FieldShell>

      <SectionTitle>Liens</SectionTitle>
      <FieldShell label="Site web">
        <input {...textProps("website")} placeholder="https://…" inputMode="url" />
      </FieldShell>
      <FieldShell label="LinkedIn">
        <input {...textProps("linkedin_url")} placeholder="https://…" inputMode="url" />
      </FieldShell>

      <SectionTitle>Prospection</SectionTitle>
      <FieldShell label="Source">
        <input {...textProps("source")} />
      </FieldShell>
      <FieldShell label="Canal">
        {isEdit ? (
          <select
            className={ui.input}
            value={v?.contact_channel ?? ""}
            onChange={(e) => set("contact_channel", e.target.value)}
          >
            <option value="">—</option>
            {CONTACT_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : (
          <select name="contact_channel" className={ui.input} defaultValue="">
            <option value="">—</option>
            {CONTACT_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </FieldShell>
      <FieldShell label="Priorité">
        {isEdit ? (
          <select
            className={ui.input}
            value={v?.priority ?? "Normale"}
            onChange={(e) => set("priority", e.target.value as ProspectBusinessFormValues["priority"])}
          >
            {PROSPECT_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        ) : (
          <select name="priority" className={ui.input} defaultValue="Normale">
            {PROSPECT_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
      </FieldShell>
      <FieldShell label="Valeur potentielle (CHF)">
        <input {...textProps("potential_value", "number")} inputMode="decimal" min={0} step="0.01" />
      </FieldShell>
      <FieldShell label="Tags" className="sm:col-span-2">
        <input {...textProps("tags")} placeholder="séparés par des virgules" />
      </FieldShell>

      {showLogo ? (
        <FieldShell label="Logo (URL)" className="sm:col-span-2">
          <input {...textProps("logo_url")} placeholder="https://…" inputMode="url" />
        </FieldShell>
      ) : null}
    </div>
  );
}
