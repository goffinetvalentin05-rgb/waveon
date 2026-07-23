"use client";

import { useState, type FormEvent } from "react";
import { format } from "date-fns";
import {
  IconCalendarEvent,
  IconClock,
  IconLoader2,
  IconMapPin,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import {
  CALENDAR_CATEGORIES,
  CALENDAR_CATEGORY_COLORS,
  CALENDAR_CATEGORY_LABELS,
  type CalendarCategory,
  type CalendarEvent,
} from "@/lib/calendar/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export type EventModalProps = {
  open: boolean;
  /** Événement à modifier, ou `null` pour une création. */
  event: CalendarEvent | null;
  /** Jour pré-rempli lors d'une création (clic sur une case vide). */
  defaultDate?: Date;
  /** Heure de début pré-remplie lors d'une création (clic sur un créneau). */
  defaultStartHour?: number;
  onClose: () => void;
  onSaved: (event: CalendarEvent) => void;
  onDeleted: (id: string) => void;
};

/**
 * Modale de création / édition d'un événement calendrier.
 * Remonte via `key` (voir usage dans CalendarClient) pour réinitialiser
 * proprement l'état du formulaire entre deux ouvertures.
 */
export function EventModal({
  open,
  event,
  defaultDate,
  defaultStartHour,
  onClose,
  onSaved,
  onDeleted,
}: EventModalProps) {
  if (!open) return null;
  return (
    <EventModalInner
      event={event}
      defaultDate={defaultDate}
      defaultStartHour={defaultStartHour}
      onClose={onClose}
      onSaved={onSaved}
      onDeleted={onDeleted}
    />
  );
}

function EventModalInner({
  event,
  defaultDate,
  defaultStartHour,
  onClose,
  onSaved,
  onDeleted,
}: Omit<EventModalProps, "open">) {
  const isEdit = Boolean(event);

  const [title, setTitle] = useState(event?.title ?? "");
  const [category, setCategory] = useState<CalendarCategory>(event?.category ?? "appointment");
  const [dateStr, setDateStr] = useState(() =>
    event ? format(new Date(event.start_at), "yyyy-MM-dd") : format(defaultDate ?? new Date(), "yyyy-MM-dd")
  );
  const [startTime, setStartTime] = useState(() => {
    if (event) return format(new Date(event.start_at), "HH:mm");
    const h = defaultStartHour ?? 9;
    return `${pad(h)}:00`;
  });
  const [endTime, setEndTime] = useState(() => {
    if (event) return format(new Date(event.end_at), "HH:mm");
    const h = defaultStartHour ?? 9;
    return `${pad(Math.min(h + 1, 23))}:00`;
  });
  const [allDay, setAllDay] = useState(event?.all_day ?? false);
  const [description, setDescription] = useState(event?.description ?? "");
  const [color, setColor] = useState(event?.color ?? CALENDAR_CATEGORY_COLORS.appointment);
  const [location, setLocation] = useState(event?.location ?? "");
  const [colorTouched, setColorTouched] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategoryChange = (next: CalendarCategory) => {
    setCategory(next);
    if (!colorTouched) setColor(CALENDAR_CATEGORY_COLORS[next]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Le titre est obligatoire.");
      return;
    }

    let start_at: string;
    let end_at: string;
    try {
      if (allDay) {
        start_at = new Date(`${dateStr}T00:00:00`).toISOString();
        end_at = new Date(`${dateStr}T23:59:59`).toISOString();
      } else {
        start_at = new Date(`${dateStr}T${startTime}:00`).toISOString();
        end_at = new Date(`${dateStr}T${endTime}:00`).toISOString();
      }
    } catch {
      setError("Date ou heure invalide.");
      return;
    }

    if (new Date(end_at) < new Date(start_at)) {
      setError("L'heure de fin doit être après l'heure de début.");
      return;
    }

    const payload = {
      title: title.trim(),
      category,
      start_at,
      end_at,
      all_day: allDay,
      description: description.trim() || null,
      color,
      location: location.trim() || null,
    };

    setSaving(true);
    try {
      const url = isEdit ? `/api/calendar/events/${event!.id}` : "/api/calendar/events";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'enregistrement.");
        return;
      }
      onSaved(data.event as CalendarEvent);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendar/events/${event.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as Record<string, unknown>);
        setError((data.error as string | undefined) ?? "Erreur lors de la suppression.");
        return;
      }
      onDeleted(event.id);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Fermer"
      />
      <form
        onSubmit={submit}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#e8eef6] bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[#e8eef6] px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Modifier l'événement" : "Nouvel événement"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fermer"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label className={ui.label}>Titre *</label>
            <input
              autoFocus
              className={ui.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Démonstration club de tennis"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={ui.label}>Catégorie</label>
              <select
                className={ui.input}
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as CalendarCategory)}
              >
                {CALENDAR_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CALENDAR_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={ui.label}>Couleur</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    setColorTouched(true);
                  }}
                  className="h-[42px] w-12 cursor-pointer rounded-xl border border-[#e8eef6] bg-white p-1"
                  aria-label="Couleur de l'événement"
                />
                <span className="text-xs text-slate-400">{color}</span>
              </div>
            </div>
          </div>

          <div>
            <label className={ui.label}>
              <IconCalendarEvent className="mr-1 inline h-3.5 w-3.5 -translate-y-px" stroke={1.75} />
              Date
            </label>
            <input
              type="date"
              className={ui.input}
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="h-4 w-4 rounded border-[#d0dbeb] text-blue-600 focus:ring-blue-500/30"
            />
            Toute la journée
          </label>

          {!allDay ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={ui.label}>
                  <IconClock className="mr-1 inline h-3.5 w-3.5 -translate-y-px" stroke={1.75} />
                  Début
                </label>
                <input
                  type="time"
                  className={ui.input}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={ui.label}>Fin</label>
                <input
                  type="time"
                  className={ui.input}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : null}

          <div>
            <label className={ui.label}>
              <IconMapPin className="mr-1 inline h-3.5 w-3.5 -translate-y-px" stroke={1.75} />
              Lieu
            </label>
            <input
              className={ui.input}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Optionnel"
            />
          </div>

          <div>
            <label className={ui.label}>Description</label>
            <textarea
              className={`${ui.input} min-h-[80px] resize-none`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes, détails…"
            />
          </div>

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          {confirmDelete ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm font-medium text-rose-800">Supprimer cet événement ?</p>
              <p className="mt-1 text-xs text-rose-600">Cette action est irréversible.</p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  className={ui.btnGhost}
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                >
                  {deleting ? (
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <IconTrash className="h-4 w-4" />
                  )}
                  Confirmer
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[#e8eef6] px-6 py-4">
          {isEdit && !confirmDelete ? (
            <button type="button" className={ui.btnDanger} onClick={() => setConfirmDelete(true)}>
              <IconTrash className="h-4 w-4" stroke={1.75} />
              Supprimer
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button type="button" className={ui.btnSecondary} onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className={ui.btnPrimary} disabled={saving}>
              {saving ? <IconLoader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
