"use client";

import { useState, type ReactNode } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { Modal } from "@/components/wavon/Modal";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import { useToast } from "@/components/wavon/Toast";
import { currencyFieldAffix, formatPrice } from "@/lib/utils/formatPrice";
import type { Service } from "@/lib/wavon/types";
import {
  btnGhostClass,
  btnPrimaryClass,
  cardClass,
  inputClass,
  labelClass,
  linkClass,
  spinnerClass,
  textareaClass,
  userTextBreakClass,
} from "@/lib/wavon/tokens";
import { canUsePremiumFeatures } from "@/lib/wavon/premium-access";
import Link from "next/link";

const SERVICE_NAME_MAX = 60;
const SERVICE_DESCRIPTION_MAX = 300;

const PREPARATION_BEFORE_TOOLTIP =
  "Temps réservé avant le RDV pour préparer ton poste ou accueillir le client. Aucun autre rendez-vous ne pourra être pris pendant ce temps.";
const PAUSE_AFTER_TOOLTIP =
  "Temps réservé après le RDV pour nettoyer ou finir une tâche. Aucun autre rendez-vous ne pourra être pris pendant ce temps.";

function InfoHintButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border border-neutral-300/90 bg-white text-[10px] font-bold leading-none text-neutral-500 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
      title={text}
      aria-label={text}
    >
      ?
    </button>
  );
}

function FieldLabelWithHint({ children, hint }: { children: ReactNode; hint: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
      <span>{children}</span>
      <InfoHintButton text={hint} />
    </div>
  );
}

export default function ServicesPage() {
  const { ready, state, addService, updateService, deleteService } = useWavon();
  const toast = useToast();
  const premium = canUsePremiumFeatures(state.workspaceAccess);
  const currency = state.settings.currency;
  const employees = state.employees ?? [];
  const activeEmployees = employees.filter((e) => e.isActive);
  const showEmployeeField = activeEmployees.length > 1;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [name, setName] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [price, setPrice] = useState(30);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [bufferBeforeMin, setBufferBeforeMin] = useState(0);
  const [bufferAfterMin, setBufferAfterMin] = useState(0);
  const [bookingNoticeHours, setBookingNoticeHours] = useState<string>("");
  const [allEmployees, setAllEmployees] = useState(true);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    if (!premium) {
      toast.push({
        kind: "error",
        message: "Choisissez une offre pour ajouter vos services.",
      });
      return;
    }
    setEditing(null);
    setName("");
    setDurationMin(30);
    setPrice(30);
    setDescription("");
    setIsActive(true);
    setIsPublic(true);
    setBufferBeforeMin(0);
    setBufferAfterMin(0);
    setBookingNoticeHours("");
    setAllEmployees(true);
    setSelectedEmployeeIds([]);
    setOpen(true);
  };

  const openEdit = (s: Service) => {
    if (!premium) {
      toast.push({ kind: "error", message: "Cette fonctionnalité nécessite un abonnement actif." });
      return;
    }
    setEditing(s);
    setName(s.name);
    setDurationMin(s.durationMin);
    setPrice(s.price);
    setDescription((s.description ?? "").slice(0, SERVICE_DESCRIPTION_MAX));
    setIsActive(Boolean(s.isActive));
    setIsPublic(Boolean(s.isPublic));
    setBufferBeforeMin(Math.max(0, s.bufferBeforeMin ?? 0));
    setBufferAfterMin(Math.max(0, s.bufferAfterMin ?? 0));
    setBookingNoticeHours(
      s.bookingNoticeHours === null || s.bookingNoticeHours === undefined ? "" : String(s.bookingNoticeHours)
    );
    const ids = s.employeeIds ?? [];
    setAllEmployees(ids.length === 0);
    setSelectedEmployeeIds(ids);
    setOpen(true);
  };

  const save = async () => {
    if (!premium) {
      toast.push({ kind: "error", message: "Cette fonctionnalité nécessite un abonnement actif." });
      return;
    }
    const trimmedName = name.trim().slice(0, SERVICE_NAME_MAX);
    if (!trimmedName) {
      toast.push({ kind: "error", message: "Le nom est requis." });
      return;
    }
    if (durationMin < 5) {
      toast.push({
        kind: "error",
        message: "La durée minimum d’un service est de 5 minutes.",
      });
      return;
    }
    if (editing) {
      updateService(editing.id, {
        name: trimmedName,
        durationMin,
        price,
        description: description.trim().slice(0, SERVICE_DESCRIPTION_MAX),
        isActive,
        isPublic,
        ...(showEmployeeField
          ? { employeeIds: allEmployees ? [] : selectedEmployeeIds }
          : { employeeIds: [] }),
        bufferBeforeMin,
        bufferAfterMin,
        bookingNoticeHours: bookingNoticeHours.trim() === "" ? null : Math.max(0, Number(bookingNoticeHours) || 0),
      });
      toast.push({ message: "Service mis à jour." });
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      const nextOrder =
        state.services.length === 0 ? 0 : Math.max(...state.services.map((x) => x.sortOrder ?? 0)) + 1;
      const res = await addService({
        name: trimmedName,
        durationMin,
        price,
        description: description.trim().slice(0, SERVICE_DESCRIPTION_MAX),
        isActive,
        isPublic,
        ...(showEmployeeField
          ? { employeeIds: allEmployees ? [] : selectedEmployeeIds }
          : { employeeIds: [] }),
        bufferBeforeMin,
        bufferAfterMin,
        bookingNoticeHours: bookingNoticeHours.trim() === "" ? null : Math.max(0, Number(bookingNoticeHours) || 0),
        color: null,
        sortOrder: nextOrder,
      });
      if (!res.ok) {
        toast.push({ kind: "error", message: res.error });
        return;
      }
      toast.push({ message: "Service créé." });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const remove = (s: Service) => {
    if (!premium) {
      toast.push({ kind: "error", message: "Cette fonctionnalité nécessite un abonnement actif." });
      return;
    }
    if (!confirm(`Supprimer « ${s.name} » ?`)) return;
    deleteService(s.id);
    toast.push({ message: "Service supprimé." });
  };

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className={spinnerClass} aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        title="Services"
        description="Chaque prestation définit la durée des créneaux sur ton agenda."
        actions={
          <button
            type="button"
            className={`${btnPrimaryClass} ${!premium ? "pointer-events-none opacity-50" : ""}`}
            onClick={openCreate}
            disabled={!premium}
          >
            Ajouter un service
          </button>
        }
      />

      {!premium ? (
        <p className="text-sm text-neutral-600">
          Mode découverte : consultation seule.{" "}
          <Link href="/dashboard/facturation#waevon-pricing" className={`${linkClass} font-medium`}>
            Voir les offres
          </Link>
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        {state.services.length === 0 ? (
          <div className={`${cardClass} md:col-span-2 text-center`}>
            <p className="text-sm text-neutral-600">Aucun service pour l’instant.</p>
            <button
              type="button"
              className={`${btnPrimaryClass} mt-5 ${!premium ? "pointer-events-none opacity-50" : ""}`}
              onClick={openCreate}
              disabled={!premium}
            >
              Créer un service
            </button>
          </div>
        ) : (
          state.services.map((s, idx) => (
            <article key={s.id} className={`${cardClass} overflow-hidden`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="line-clamp-2 min-w-0 max-w-full break-words text-lg font-semibold tracking-tight text-neutral-950 [overflow-wrap:anywhere]">
                    {s.name}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`rounded-full border px-2.5 py-1 font-medium ${
                        s.isActive
                          ? "border-emerald-200/80 bg-emerald-50 text-emerald-900"
                          : "border-neutral-200/90 bg-neutral-50 text-neutral-600"
                      }`}
                    >
                      {s.isActive ? "Actif" : "Inactif"}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 font-medium ${
                        s.isPublic
                          ? "border-neutral-200/90 bg-white text-neutral-800"
                          : "border-neutral-200/90 bg-neutral-50 text-neutral-500"
                      }`}
                    >
                      {s.isPublic ? "Public" : "Masqué"}
                    </span>
                    {(s.bufferBeforeMin ?? 0) > 0 || (s.bufferAfterMin ?? 0) > 0 ? (
                      <span className="rounded-full border border-neutral-200/90 bg-neutral-50 px-2.5 py-1 font-medium text-neutral-700">
                        Préparation {s.bufferBeforeMin ?? 0} min · Pause {s.bufferAfterMin ?? 0} min
                      </span>
                    ) : null}
                    {s.bookingNoticeHours !== null && s.bookingNoticeHours !== undefined ? (
                      <span className="rounded-full border border-neutral-200/90 bg-neutral-50 px-2.5 py-1 font-medium text-neutral-700">
                        Préavis {s.bookingNoticeHours}h
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={btnGhostClass + " min-h-9 px-3 text-xs"}
                      onClick={() => updateService(s.id, { isActive: !s.isActive })}
                    >
                      {s.isActive ? "Désactiver" : "Activer"}
                    </button>
                    <button
                      type="button"
                      className={btnGhostClass + " min-h-9 px-3 text-xs"}
                      onClick={() => updateService(s.id, { isPublic: !s.isPublic })}
                    >
                      {s.isPublic ? "Masquer" : "Publier"}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={btnGhostClass + " min-h-9 px-3 text-xs"}
                      disabled={idx === 0}
                      onClick={() => {
                        const prev = state.services[idx - 1];
                        if (!prev) return;
                        updateService(s.id, { sortOrder: (prev.sortOrder ?? 0) });
                        updateService(prev.id, { sortOrder: (s.sortOrder ?? 0) });
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={btnGhostClass + " min-h-9 px-3 text-xs"}
                      disabled={idx === state.services.length - 1}
                      onClick={() => {
                        const next = state.services[idx + 1];
                        if (!next) return;
                        updateService(s.id, { sortOrder: (next.sortOrder ?? 0) });
                        updateService(next.id, { sortOrder: (s.sortOrder ?? 0) });
                      }}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </div>
              <ServiceDescription text={s.description || ""} />
              <dl className="mt-5 flex flex-wrap gap-8 border-t border-neutral-100 pt-5 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    Durée
                  </dt>
                  <dd className="mt-1 font-medium tabular-nums text-neutral-950">{s.durationMin} min</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">Prix</dt>
                  <dd className="mt-1 font-medium text-neutral-950">{formatPrice(s.price, currency)}</dd>
                </div>
              </dl>
              <div className="mt-6 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => openEdit(s)}
                  className={`${linkClass} ${!premium ? "pointer-events-none opacity-45" : ""}`}
                  disabled={!premium}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => remove(s)}
                  disabled={!premium}
                  className={`text-sm font-medium text-red-600/90 underline-offset-4 hover:underline ${!premium ? "pointer-events-none opacity-45" : ""}`}
                >
                  Supprimer
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Modifier le service" : "Nouveau service"}
        footer={
          <>
            <button type="button" className={btnGhostClass} onClick={() => setOpen(false)}>
              Annuler
            </button>
            <button
              type="button"
              className={btnPrimaryClass}
              onClick={() => void save()}
              disabled={saving}
            >
              Enregistrer
            </button>
          </>
        }
      >
        <div className="grid gap-5">
          <div>
            <label className={labelClass}>Nom</label>
            <input
              className={`${inputClass} mt-2`}
              value={name}
              maxLength={SERVICE_NAME_MAX}
              onChange={(e) => setName(e.target.value.slice(0, SERVICE_NAME_MAX))}
            />
            <p className="mt-1 text-xs tabular-nums text-neutral-400">
              {name.length}/{SERVICE_NAME_MAX}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Durée (minutes)</label>
              <input
                type="number"
                min={5}
                step={5}
                className={`${inputClass} mt-2`}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              />
            </div>
            <div>
              <label className={labelClass}>Prix</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={1}
                  className={`${inputClass} min-w-0 flex-1`}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
                <span className="shrink-0 text-sm font-medium tabular-nums text-neutral-500">
                  {currencyFieldAffix(currency)}
                </span>
              </div>
            </div>
          </div>

          {showEmployeeField ? (
            <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Prestataires qui peuvent effectuer ce service
              </p>
              <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={allEmployees}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setAllEmployees(v);
                    if (v) setSelectedEmployeeIds([]);
                  }}
                  className="size-4 rounded border-neutral-300 text-neutral-950"
                />
                <span className="font-medium text-neutral-950">Tous les prestataires</span>
              </label>
              {!allEmployees ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {activeEmployees.map((e) => (
                    <label key={e.id} className={`flex cursor-pointer items-center gap-3 text-sm ${userTextBreakClass}`}>
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.includes(e.id)}
                        onChange={(ev) => {
                          const checked = ev.target.checked;
                          setSelectedEmployeeIds((prev) =>
                            checked ? [...prev, e.id] : prev.filter((x) => x !== e.id)
                          );
                        }}
                        className="size-4 rounded border-neutral-300 text-neutral-950"
                      />
                      <span className="font-medium text-neutral-950">{e.name}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded border-neutral-300 text-neutral-950"
              />
              <span className="font-medium text-neutral-950">Actif</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="size-4 rounded border-neutral-300 text-neutral-950"
              />
              <span className="font-medium text-neutral-950">Visible sur la page publique</span>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <FieldLabelWithHint hint={PREPARATION_BEFORE_TOOLTIP}>
                Temps de préparation avant (min)
              </FieldLabelWithHint>
              <input
                type="number"
                min={0}
                step={5}
                className={`${inputClass} mt-2`}
                value={bufferBeforeMin}
                onChange={(e) => setBufferBeforeMin(Math.max(0, Number(e.target.value) || 0))}
              />
              <p className="mt-1 text-xs text-neutral-400">Laisse à 0 si tu n&apos;en as pas besoin.</p>
            </div>
            <div>
              <FieldLabelWithHint hint={PAUSE_AFTER_TOOLTIP}>Temps de pause après (min)</FieldLabelWithHint>
              <input
                type="number"
                min={0}
                step={5}
                className={`${inputClass} mt-2`}
                value={bufferAfterMin}
                onChange={(e) => setBufferAfterMin(Math.max(0, Number(e.target.value) || 0))}
              />
              <p className="mt-1 text-xs text-neutral-400">Laisse à 0 si tu n&apos;en as pas besoin.</p>
            </div>
            <div>
              <label className={labelClass}>Préavis (heures)</label>
              <input
                type="number"
                min={0}
                step={1}
                className={`${inputClass} mt-2`}
                value={bookingNoticeHours}
                onChange={(e) => setBookingNoticeHours(e.target.value)}
                placeholder="(optionnel)"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={`${textareaClass} mt-2`}
              value={description}
              maxLength={SERVICE_DESCRIPTION_MAX}
              onChange={(e) => setDescription(e.target.value.slice(0, SERVICE_DESCRIPTION_MAX))}
            />
            <p className="mt-1 text-xs tabular-nums text-neutral-400">
              {description.length}/{SERVICE_DESCRIPTION_MAX}
            </p>
          </div>
          <p className="text-xs leading-relaxed text-neutral-400">
            La durée, la préparation et la pause après le rendez-vous, ainsi que le préavis, influencent directement les
            créneaux proposés sur la page publique.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function ServiceDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!text.trim()) {
    return <p className="mt-2 text-sm leading-relaxed text-neutral-500">Pas de description.</p>;
  }
  const long = text.length > 180 || text.split("\n").length > 3;
  return (
    <div className="mt-2 min-w-0 overflow-hidden">
      <p
        className={`max-w-full break-words text-sm leading-relaxed text-neutral-500 [overflow-wrap:anywhere] ${expanded ? "" : "line-clamp-3"}`}
      >
        {text}
      </p>
      {long ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`${linkClass} mt-2 inline-block text-xs`}
        >
          {expanded ? "Voir moins" : "Voir plus"}
        </button>
      ) : null}
    </div>
  );
}
