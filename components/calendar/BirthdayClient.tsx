"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  IconArrowLeft,
  IconCake,
  IconEdit,
  IconLoader2,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { birthdayAgeOn, daysUntil, nextBirthdayDate } from "@/lib/calendar/helpers";
import type { Birthday } from "@/lib/calendar/types";

function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function fmtDay(iso: string): string {
  return format(new Date(`${iso}T12:00:00`), "d MMMM yyyy", { locale: fr });
}

export function BirthdayClient({ initial }: { initial: Birthday[] }) {
  const [birthdays, setBirthdays] = useState<Birthday[]>(initial);
  const [loading, setLoading] = useState(initial.length === 0);
  const [error, setError] = useState<string | null>(null);
  // undefined = fermé · null = création · Birthday = édition
  const [modalBirthday, setModalBirthday] = useState<Birthday | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Birthday | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (initial.length > 0) {
      setLoading(false);
      return;
    }
    let active = true;
    fetch("/api/calendar/birthdays")
      .then((r) => r.json())
      .then((d) => {
        if (active && Array.isArray(d.birthdays)) setBirthdays(d.birthdays);
      })
      .catch(() => {
        if (active) setError("Erreur lors du chargement.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- exécuté une seule fois au montage
  }, []);

  const sorted = useMemo(() => {
    const today = todayISO();
    return [...birthdays]
      .map((b) => {
        const next = nextBirthdayDate(b.birth_date, today);
        return { b, next, days: daysUntil(today, next), age: birthdayAgeOn(b.birth_date, next) };
      })
      .sort((a, c) => a.days - c.days);
  }, [birthdays]);

  const toggleReminder = async (b: Birthday, field: "remind_day_before" | "remind_same_day") => {
    const previous = b;
    const optimistic: Birthday = { ...b, [field]: !b[field] };
    setBirthdays((prev) => prev.map((x) => (x.id === b.id ? optimistic : x)));
    try {
      const res = await fetch(`/api/calendar/birthdays/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_name: b.person_name,
          birth_date: b.birth_date,
          note: b.note,
          remind_day_before: field === "remind_day_before" ? !b.remind_day_before : b.remind_day_before,
          remind_same_day: field === "remind_same_day" ? !b.remind_same_day : b.remind_same_day,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setBirthdays((prev) => prev.map((x) => (x.id === b.id ? data.birthday : x)));
    } catch {
      setBirthdays((prev) => prev.map((x) => (x.id === b.id ? previous : x)));
      setError("Impossible de mettre à jour le rappel.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendar/birthdays/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as Record<string, unknown>);
        throw new Error((data.error as string | undefined) ?? "Erreur");
      }
      setBirthdays((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError("Erreur lors de la suppression.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="crm-animate-in space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/personal/calendar"
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-wo-muted transition hover:text-wo-text"
          >
            <IconArrowLeft className="h-4 w-4" stroke={1.75} />
            Calendrier
          </Link>
          <h1 className={ui.h1}>Anniversaires</h1>
          <p className="mt-1 text-sm text-wo-muted">
            {birthdays.length} anniversaire{birthdays.length > 1 ? "s" : ""} enregistré
            {birthdays.length > 1 ? "s" : ""}
          </p>
        </div>
        <button type="button" className={ui.btnPrimary} onClick={() => setModalBirthday(null)}>
          <IconPlus className="h-4 w-4" stroke={2} />
          Nouvel anniversaire
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className={`${ui.card} flex items-center justify-center gap-2 px-6 py-16 text-sm text-wo-dim`}>
          <IconLoader2 className="h-4 w-4 animate-spin" />
          Chargement…
        </div>
      ) : sorted.length === 0 ? (
        <div className={`${ui.card} px-6 py-16 text-center`}>
          <IconCake className="mx-auto h-8 w-8 text-wo-dim" stroke={1.5} />
          <p className="mt-3 text-sm text-wo-muted">Aucun anniversaire enregistré.</p>
          <button type="button" className={`${ui.btnSecondary} mt-4`} onClick={() => setModalBirthday(null)}>
            <IconPlus className="h-4 w-4" />
            Ajouter un anniversaire
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(({ b, next, days, age }) => (
            <div
              key={b.id}
              className={`${ui.card} flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                  <IconCake className="h-5 w-5" stroke={1.75} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-wo-text">{b.person_name}</p>
                  <p className="text-xs text-wo-muted">Né(e) le {fmtDay(b.birth_date)}</p>
                  {b.note ? <p className="mt-0.5 text-xs text-wo-dim">{b.note}</p> : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                <div className="text-right">
                  <p className="text-sm font-medium text-wo-text">
                    {days === 0 ? "Aujourd'hui 🎉" : days === 1 ? "Demain" : `Dans ${days} jours`}
                  </p>
                  <p className="text-xs text-wo-dim">
                    {format(new Date(`${next}T12:00:00`), "d MMMM", { locale: fr })}
                    {age !== null ? ` · ${age} ans` : ""}
                  </p>
                </div>

                <div className="flex gap-1.5">
                  <ReminderToggle
                    label="J-1"
                    active={b.remind_day_before}
                    onClick={() => void toggleReminder(b, "remind_day_before")}
                  />
                  <ReminderToggle
                    label="Jour J"
                    active={b.remind_same_day}
                    onClick={() => void toggleReminder(b, "remind_same_day")}
                  />
                </div>

                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-wo-dim transition hover:bg-wo-hover hover:text-wo-secondary"
                    onClick={() => setModalBirthday(b)}
                    aria-label="Modifier"
                  >
                    <IconEdit className="h-4 w-4" stroke={1.75} />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-wo-dim transition hover:bg-rose-500/10 hover:text-rose-300"
                    onClick={() => setDeleteTarget(b)}
                    aria-label="Supprimer"
                  >
                    <IconTrash className="h-4 w-4" stroke={1.75} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalBirthday !== undefined ? (
        <BirthdayModal
          key={modalBirthday?.id ?? "create"}
          birthday={modalBirthday}
          onClose={() => setModalBirthday(undefined)}
          onSaved={(saved) => {
            setBirthdays((prev) => {
              const exists = prev.some((x) => x.id === saved.id);
              return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved];
            });
            setModalBirthday(undefined);
          }}
        />
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className={ui.overlay}
            onClick={() => setDeleteTarget(null)}
            aria-label="Fermer"
          />
          <div className={`${ui.modal} max-w-md p-6`}>
            <h3 className="text-lg font-semibold text-wo-text">Supprimer cet anniversaire ?</h3>
            <p className="mt-2 text-sm text-wo-muted">
              L&apos;anniversaire de <strong>{deleteTarget.person_name}</strong> sera définitivement
              supprimé.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className={ui.btnSecondary} onClick={() => setDeleteTarget(null)}>
                Annuler
              </button>
              <button
                type="button"
                className={ui.btnDanger}
                disabled={deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? (
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <IconTrash className="h-4 w-4" />
                )}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReminderToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
        active
          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
          : "border-wo-border bg-transparent text-wo-dim hover:bg-wo-hover"
      }`}
      title={active ? `Rappel ${label} activé` : `Rappel ${label} désactivé`}
    >
      {label}
    </button>
  );
}

function BirthdayModal({
  birthday,
  onClose,
  onSaved,
}: {
  birthday: Birthday | null;
  onClose: () => void;
  onSaved: (b: Birthday) => void;
}) {
  const isEdit = Boolean(birthday);
  const [personName, setPersonName] = useState(birthday?.person_name ?? "");
  const [birthDate, setBirthDate] = useState(birthday?.birth_date ?? "");
  const [note, setNote] = useState(birthday?.note ?? "");
  const [remindDayBefore, setRemindDayBefore] = useState(birthday?.remind_day_before ?? true);
  const [remindSameDay, setRemindSameDay] = useState(birthday?.remind_same_day ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!personName.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      setError("Date de naissance invalide.");
      return;
    }
    setSaving(true);
    try {
      const url = isEdit ? `/api/calendar/birthdays/${birthday!.id}` : "/api/calendar/birthdays";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_name: personName.trim(),
          birth_date: birthDate,
          note: note.trim() || null,
          remind_day_before: remindDayBefore,
          remind_same_day: remindSameDay,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur.");
        return;
      }
      onSaved(data.birthday as Birthday);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className={ui.overlay}
        onClick={onClose}
        aria-label="Fermer"
      />
      <form
        onSubmit={submit}
        className={`${ui.modal} max-w-md p-6`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-wo-text">
            {isEdit ? "Modifier l'anniversaire" : "Nouvel anniversaire"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-wo-dim transition hover:bg-wo-hover hover:text-wo-muted"
            aria-label="Fermer"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className={ui.label}>Nom *</label>
            <input
              autoFocus
              className={ui.input}
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Ex. Marie Dupont"
            />
          </div>
          <div>
            <label className={ui.label}>Date de naissance *</label>
            <input
              type="date"
              className={ui.input}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={ui.label}>Note</label>
            <input
              className={ui.input}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optionnel"
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-wo-secondary">
              <input
                type="checkbox"
                checked={remindDayBefore}
                onChange={(e) => setRemindDayBefore(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 text-indigo-600 focus:ring-indigo-500/30"
              />
              Rappel la veille
            </label>
            <label className="flex items-center gap-2 text-sm text-wo-secondary">
              <input
                type="checkbox"
                checked={remindSameDay}
                onChange={(e) => setRemindSameDay(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 text-indigo-600 focus:ring-indigo-500/30"
              />
              Rappel le jour J
            </label>
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className={ui.btnPrimary} disabled={saving}>
            {saving ? <IconLoader2 className="h-4 w-4 animate-spin" /> : null}
            {isEdit ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}
