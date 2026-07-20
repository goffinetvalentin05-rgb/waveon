"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  IconArrowLeft,
  IconDots,
  IconEdit,
  IconMail,
  IconPhone,
  IconPresentation,
  IconTrash,
  IconUserCheck,
  IconUserX,
} from "@tabler/icons-react";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { QUICK_ACTION_LABELS } from "@/lib/crm/actions";
import type {
  Prospect,
  ProspectActivity,
  QuickAction,
  ProspectStatus,
  ActionType,
} from "@/lib/crm/types";
import { PROSPECT_STATUSES } from "@/lib/crm/types";
import { ui } from "@/lib/design/tokens";

function fmtDay(iso: string) {
  return format(new Date(iso), "d MMMM yyyy", { locale: fr });
}

function toDateInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return String(iso).slice(0, 10);
  }
}

type ConfirmTone = "default" | "danger";

function ConfirmModal({
  open,
  title,
  description,
  tone,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  tone?: ConfirmTone;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  const isDanger = tone === "danger";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="Fermer"
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-[#e8eef6] bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {description ? (
          <p className="mt-2 text-sm text-slate-600 whitespace-pre-line">{description}</p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={
              isDanger
                ? "inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                : ui.btnPrimary
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type InlineField = "phone" | "email" | "contact_name";

function InlineValue({
  label,
  value,
  telHref,
  mailHref,
  inline,
  onStart,
  onChange,
  onCancel,
  onSave,
}: {
  label: string;
  value: string | null;
  telHref?: string;
  mailHref?: string;
  inline: boolean;
  onStart: () => void;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-800">
        {inline ? (
          <div className="flex items-center justify-end gap-2">
            <input
              className={ui.input + " w-56"}
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
            />
            <button type="button" className={ui.btnPrimary} onClick={onSave}>
              Enregistrer
            </button>
            <button type="button" className={ui.btnGhost} onClick={onCancel}>
              Annuler
            </button>
          </div>
        ) : value ? (
          <div className="flex items-center justify-end gap-2">
            {telHref ? (
              <a
                href={telHref}
                className="text-blue-600 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  onStart();
                }}
              >
                {value}
              </a>
            ) : mailHref ? (
              <a
                href={mailHref}
                className="text-blue-600 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  onStart();
                }}
              >
                {value}
              </a>
            ) : (
              <span
                className="cursor-pointer hover:text-blue-600"
                onClick={() => onStart()}
              >
                {value}
              </span>
            )}
            <button
              type="button"
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              onClick={onStart}
              aria-label={`Modifier ${label}`}
            >
              <IconEdit className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <span
              className="cursor-pointer text-slate-400 hover:text-blue-600"
              onClick={() => onStart()}
            >
              —
            </span>
            <button
              type="button"
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              onClick={onStart}
              aria-label={`Modifier ${label}`}
            >
              <IconEdit className="h-4 w-4" />
            </button>
          </div>
        )}
      </dd>
    </div>
  );
}

type ActivityEditState = {
  action_type: "mail_sent" | "call_made" | "demo_scheduled" | "client" | "refus" | "status_change";
  action_date: string; // YYYY-MM-DD
  note: string;
  to_status: ProspectStatus;
  demo_at: string; // YYYY-MM-DD
};

function parseDemoEditDescription(description: string | null) {
  if (!description) return { note: "", demo_at: "" };
  if (!description.trim().startsWith("{")) return { note: description, demo_at: "" };
  try {
    const parsed = JSON.parse(description);
    const note = parsed?.note ? String(parsed.note) : "";
    const demoAtIso = parsed?.demoAt ?? parsed?.demo_at ?? null;
    const demo_at = demoAtIso ? new Date(String(demoAtIso)).toISOString().slice(0, 10) : "";
    return { note, demo_at };
  } catch {
    return { note: description, demo_at: "" };
  }
}

function ProspectActivityEditorModal({
  open,
  activity,
  prospectId,
  onClose,
  onSaved,
}: {
  open: boolean;
  activity: ProspectActivity;
  prospectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const initial = useMemo((): ActivityEditState => {
    const action_date = toDateInputValue(activity.created_at);
    if (activity.action_type === "status_change") {
      return {
        action_type: "status_change",
        action_date,
        note: activity.description ?? "",
        to_status: (activity.description ?? "À contacter") as ProspectStatus,
        demo_at: "",
      };
    }
    if (activity.action_type === "demo_scheduled") {
      const parsed = parseDemoEditDescription(activity.description);
      return {
        action_type: "demo_scheduled",
        action_date,
        note: parsed.note,
        to_status: "À contacter",
        demo_at: parsed.demo_at || toDateInputValue(activity.created_at),
      };
    }
    // For mail_sent/call_made/client/refus or legacy: default to current action_type if supported.
    const action_type = activity.action_type;
    const note = activity.description ?? "";
    if (
      action_type === "mail_sent" ||
      action_type === "call_made" ||
      action_type === "client" ||
      action_type === "refus"
    ) {
      return {
        action_type,
        action_date,
        note,
        to_status: "À contacter",
        demo_at: "",
      };
    }
    // Fallback
    return {
      action_type: "mail_sent",
      action_date,
      note,
      to_status: "À contacter",
      demo_at: "",
    };
  }, [activity]);

  const [state, setState] = useState<ActivityEditState>(initial);
  // Keep in sync when modal opens for another activity.
  useEffect(() => {
    if (open) setState(initial);
  }, [open, initial]);

  const submit = async () => {
    setSaving(true);
    try {
      const body: {
        action_type: ActivityEditState["action_type"];
        action_date: string;
        demo_at?: string;
        to_status?: ProspectStatus;
        note?: string | null;
      } = {
        action_type: state.action_type,
        action_date: state.action_date,
      };
      if (state.action_type === "demo_scheduled") {
        body.demo_at = state.demo_at;
        body.note = state.note || null;
      } else if (state.action_type === "status_change") {
        body.to_status = state.to_status;
        body.note = state.note || null;
      } else {
        body.note = state.note || null;
      }

      const res = await fetch(
        `/api/prospects/${prospectId}/activities/${activity.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Erreur lors de la modification.");
        return;
      }
      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return !open ? null : (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#e8eef6] bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Modifier l’action</h3>
            <p className="mt-1 text-sm text-slate-500">{activity.title}</p>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            onClick={onClose}
          >
            Annuler
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={ui.label}>Type d’action</label>
            <select
              className={ui.input}
              value={state.action_type}
              onChange={(e) =>
                setState((s) => ({ ...s, action_type: e.target.value as ActivityEditState["action_type"] }))
              }
            >
              <option value="mail_sent">Mail envoyé</option>
              <option value="call_made">Appel effectué</option>
              <option value="demo_scheduled">Démonstration planifiée</option>
              <option value="client">Client</option>
              <option value="refus">Refus</option>
              <option value="status_change">Changement de statut</option>
            </select>
          </div>

          <div>
            <label className={ui.label}>Date de l’action</label>
            <input
              type="date"
              className={ui.input}
              value={state.action_date}
              onChange={(e) => setState((s) => ({ ...s, action_date: e.target.value }))}
            />
          </div>

          {state.action_type === "demo_scheduled" ? (
            <div>
              <label className={ui.label}>Date prévue démo</label>
              <input
                type="date"
                className={ui.input}
                value={state.demo_at}
                onChange={(e) => setState((s) => ({ ...s, demo_at: e.target.value }))}
              />
            </div>
          ) : null}

          {state.action_type === "status_change" ? (
            <div className="sm:col-span-2">
              <label className={ui.label}>Nouveau statut</label>
              <select
                className={ui.input}
                value={state.to_status}
                onChange={(e) => setState((s) => ({ ...s, to_status: e.target.value as ProspectStatus }))}
              >
                {PROSPECT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <label className={ui.label}>Note</label>
            <textarea
              className={ui.input + " min-h-[120px] resize-y"}
              value={state.note}
              onChange={(e) => setState((s) => ({ ...s, note: e.target.value }))}
              placeholder="Note optionnelle…"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button type="button" className={ui.btnPrimary} onClick={() => void submit()} disabled={saving}>
            {saving ? "En cours…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProspectDetailClient2({
  prospect: initial,
  activities: initialActivities,
}: {
  prospect: Prospect;
  activities: ProspectActivity[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [prospect, setProspect] = useState(initial);
  const [activities, setActivities] = useState(initialActivities);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [msg, setMsg] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState({
    club_name: initial.club_name ?? "",
    sport: initial.sport ?? "",
    canton: initial.canton ?? "",
    ville: initial.ville ?? "",
    contact_name: initial.contact_name ?? "",
    contact_function: initial.contact_function ?? "",
    phone: initial.phone ?? "",
    email: initial.email ?? "",
    website: initial.website ?? "",
    notes: initial.notes ?? "",
    status: initial.status as ProspectStatus,
  });

  const [inlineEditing, setInlineEditing] = useState<{
    field: InlineField;
    value: string;
  } | null>(null);

  const [confirm, setConfirm] = useState<{
    title: string;
    description?: string;
    tone?: ConfirmTone;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
  } | null>(null);

  const editableActions = useMemo(() => {
    return new Set<ActionType>(["mail_sent", "call_made", "demo_scheduled", "client", "refus", "status_change"]);
  }, []);

  const [activityMenuId, setActivityMenuId] = useState<string | null>(null);
  const [activityToEdit, setActivityToEdit] = useState<ProspectActivity | null>(null);

  const refreshAll = async () => {
    const refreshed = await fetch(`/api/prospects/${prospect.id}`);
    const json = await refreshed.json();
    if (refreshed.ok) {
      setProspect(json.prospect as Prospect);
      setActivities(json.activities as ProspectActivity[]);
      setNotes((json.prospect as Prospect).notes ?? "");
    }
    router.refresh();
  };

  const runAction = (action: QuickAction) => {
    setMsg(null);
    startTransition(async () => {
      const res = await fetch(`/api/prospects/${prospect.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Erreur");
        return;
      }
      setMsg(`${QUICK_ACTION_LABELS[action]} — enregistré.`);
      await refreshAll();
    });
  };

  const saveNotes = () => {
    startTransition(async () => {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Erreur lors de l’enregistrement.");
        return;
      }
      setMsg("Notes enregistrées.");
      await refreshAll();
    });
  };

  const saveInlineField = (field: InlineField, value: string) => {
    startTransition(async () => {
      const payload: Record<string, string> = { [field]: value };
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Erreur.");
        return;
      }
      setMsg("Modification enregistrée.");
      await refreshAll();
    });
  };

  const handleSaveDraft = () => {
    const originalStatus = prospect.status as ProspectStatus;
    const nextStatus = draft.status as ProspectStatus;

    const doSave = async () => {
      const patchBody = {
        club_name: draft.club_name,
        sport: draft.sport,
        canton: draft.canton,
        ville: draft.ville,
        contact_name: draft.contact_name,
        contact_function: draft.contact_function,
        phone: draft.phone,
        email: draft.email,
        website: draft.website,
        notes: draft.notes,
      };

      const patchRes = await fetch(`/api/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      const patchData = await patchRes.json();
      if (!patchRes.ok) {
        setMsg(patchData.error ?? "Erreur lors de la sauvegarde.");
        return;
      }

      if (nextStatus !== originalStatus) {
        const statusRes = await fetch(`/api/prospects/${prospect.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });
        const statusData = await statusRes.json();
        if (!statusRes.ok) {
          setMsg(statusData.error ?? "Erreur lors du changement de statut.");
          return;
        }
        setActivities(statusData.activities as ProspectActivity[]);
        setProspect(statusData.prospect as Prospect);
      }

      setEditMode(false);
      setMsg("Informations enregistrées.");
      await refreshAll();
    };

    if ((nextStatus === "Client" || nextStatus === "Refus") && nextStatus !== originalStatus) {
      setConfirm({
        tone: "default",
        title: "Confirmer le changement de statut ?",
        description: `Passer le statut à « ${nextStatus} ».`,
        confirmLabel: "Confirmer",
        cancelLabel: "Annuler",
        onConfirm: () => {
          setConfirm(null);
          void doSave();
        },
      });
      return;
    }
    void doSave();
  };

  const undoLastAction = () => {
    setConfirm({
      tone: "danger",
      title: "Annuler la dernière action ?",
      description: "Une confirmation est nécessaire avant suppression de l’entrée la plus récente.",
      confirmLabel: "Annuler la dernière action",
      cancelLabel: "Annuler",
      onConfirm: () => {
        setConfirm(null);
        startTransition(async () => {
          const res = await fetch(`/api/prospects/${prospect.id}/actions/undo-latest`, { method: "POST" });
          const data = await res.json();
          if (!res.ok) {
            setMsg(data.error ?? "Erreur.");
            return;
          }
          setMsg("Dernière action annulée.");
          setActivityMenuId(null);
          await refreshAll();
        });
      },
    });
  };

  const statusSelector = (
    <select
      className={ui.input + " w-56"}
      value={prospect.status}
      onChange={(e) => {
        const next = e.target.value as ProspectStatus;
        if (next === prospect.status) return;

        if (next === "Client" || next === "Refus") {
          setConfirm({
            tone: "default",
            title: "Confirmer le changement de statut ?",
            description: `Passer le statut à « ${next} ».`,
            confirmLabel: "Confirmer",
            cancelLabel: "Annuler",
            onConfirm: () => {
              setConfirm(null);
              startTransition(async () => {
                const res = await fetch(`/api/prospects/${prospect.id}/status`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: next }),
                });
                const data = await res.json();
                if (!res.ok) {
                  setMsg(data.error ?? "Erreur.");
                  return;
                }
                setMsg("Statut mis à jour.");
                setProspect(data.prospect as Prospect);
                setActivities(data.activities as ProspectActivity[]);
                await refreshAll();
              });
            },
          });
          return;
        }

        startTransition(async () => {
          const res = await fetch(`/api/prospects/${prospect.id}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: next }),
          });
          const data = await res.json();
          if (!res.ok) {
            setMsg(data.error ?? "Erreur.");
            return;
          }
          setMsg("Statut mis à jour.");
          setProspect(data.prospect as Prospect);
          setActivities(data.activities as ProspectActivity[]);
          await refreshAll();
        });
      }}
    >
      {PROSPECT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );

  const quickActions = [
    {
      key: "mail_sent" as const,
      label: "Mail envoyé",
      icon: <IconMail className="h-4 w-4" />,
      className: ui.btnSecondary,
    },
    {
      key: "call_made" as const,
      label: "Appel effectué",
      icon: <IconPhone className="h-4 w-4" />,
      className: ui.btnSecondary,
    },
    {
      key: "demo_scheduled" as const,
      label: "Démonstration planifiée",
      icon: <IconPresentation className="h-4 w-4" />,
      className: ui.btnSecondary,
    },
    {
      key: "client" as const,
      label: "Client",
      icon: <IconUserCheck className="h-4 w-4" />,
      className:
        "inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100",
    },
    {
      key: "refus" as const,
      label: "Refus",
      icon: <IconUserX className="h-4 w-4" />,
      className: ui.btnDanger,
    },
  ];

  const canUndo = activities.some((a) => editableActions.has(a.action_type));

  const activityMenuOpen = activityMenuId;

  return (
    <div className="space-y-6 crm-animate-in">
      <div>
        <Link
          href="/prospects"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <IconArrowLeft className="h-4 w-4" />
          Prospects
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className={ui.h1}>{prospect.club_name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={prospect.status} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!editMode ? statusSelector : null}

            {editMode ? (
              <>
                <button
                  type="button"
                  className={ui.btnSecondary}
                  onClick={() => setEditMode(false)}
                  disabled={pending}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className={ui.btnPrimary}
                  disabled={pending || !draft.club_name.trim()}
                  onClick={handleSaveDraft}
                >
                  Enregistrer les modifications
                </button>
              </>
            ) : (
              <button
                type="button"
                className={ui.btnSecondary}
                onClick={() => {
                  setDraft({
                    club_name: prospect.club_name ?? "",
                    sport: prospect.sport ?? "",
                    canton: prospect.canton ?? "",
                    ville: prospect.ville ?? "",
                    contact_name: prospect.contact_name ?? "",
                    contact_function: prospect.contact_function ?? "",
                    phone: prospect.phone ?? "",
                    email: prospect.email ?? "",
                    website: prospect.website ?? "",
                    notes: prospect.notes ?? "",
                    status: prospect.status,
                  });
                  setEditMode(true);
                  setMsg(null);
                }}
              >
                <IconEdit className="h-4 w-4" stroke={1.75} />
                Modifier les informations
              </button>
            )}
          </div>
        </div>
      </div>

      {msg ? (
        <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          {msg}
        </p>
      ) : null}

      <section className={`${ui.card} p-5 sm:p-6`}>
        <h2 className={ui.h2}>Actions rapides</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <button
              key={a.key}
              type="button"
              disabled={pending}
              className={a.className}
              onClick={() => runAction(a.key)}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={`${ui.card} p-5 sm:p-6`}>
          <h2 className={ui.h2}>Informations générales</h2>

          {!editMode ? (
            <dl className="mt-4 space-y-0 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
                <dt className="text-slate-400">Sport</dt>
                <dd className="text-right font-medium text-slate-800">{prospect.sport ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
                <dt className="text-slate-400">Canton</dt>
                <dd className="text-right font-medium text-slate-800">{prospect.canton ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
                <dt className="text-slate-400">Ville</dt>
                <dd className="text-right font-medium text-slate-800">{prospect.ville ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
                <dt className="text-slate-400">Fonction du contact</dt>
                <dd className="text-right font-medium text-slate-800">{prospect.contact_function ?? "—"}</dd>
              </div>

              <InlineValue
                label="Nom du contact"
                value={inlineEditing?.field === "contact_name" ? inlineEditing.value : prospect.contact_name}
                inline={inlineEditing?.field === "contact_name"}
                onStart={() => setInlineEditing({ field: "contact_name", value: prospect.contact_name ?? "" })}
                onChange={(v) => setInlineEditing((s) => (s ? { ...s, value: v } : s))}
                onCancel={() => setInlineEditing(null)}
                onSave={() => {
                  if (!inlineEditing) return;
                  saveInlineField("contact_name", inlineEditing.value);
                  setInlineEditing(null);
                }}
              />
              <InlineValue
                label="Téléphone"
                value={inlineEditing?.field === "phone" ? inlineEditing.value : prospect.phone}
                telHref={prospect.phone ? `tel:${prospect.phone}` : undefined}
                inline={inlineEditing?.field === "phone"}
                onStart={() => setInlineEditing({ field: "phone", value: prospect.phone ?? "" })}
                onChange={(v) => setInlineEditing((s) => (s ? { ...s, value: v } : s))}
                onCancel={() => setInlineEditing(null)}
                onSave={() => {
                  if (!inlineEditing) return;
                  saveInlineField("phone", inlineEditing.value);
                  setInlineEditing(null);
                }}
              />
              <InlineValue
                label="Email"
                value={inlineEditing?.field === "email" ? inlineEditing.value : prospect.email}
                mailHref={prospect.email ? `mailto:${prospect.email}` : undefined}
                inline={inlineEditing?.field === "email"}
                onStart={() => setInlineEditing({ field: "email", value: prospect.email ?? "" })}
                onChange={(v) => setInlineEditing((s) => (s ? { ...s, value: v } : s))}
                onCancel={() => setInlineEditing(null)}
                onSave={() => {
                  if (!inlineEditing) return;
                  saveInlineField("email", inlineEditing.value);
                  setInlineEditing(null);
                }}
              />

              <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
                <dt className="text-slate-400">Site web</dt>
                <dd className="text-right font-medium text-slate-800">
                  {prospect.website ? (
                    <a
                      href={prospect.website.startsWith("http") ? prospect.website : `https://${prospect.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {prospect.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>

              <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
                <dt className="text-slate-400">Dernière action</dt>
                <dd className="text-right font-medium text-slate-800">{prospect.last_action ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
                <dt className="text-slate-400">Prochaine relance</dt>
                <dd className="text-right font-medium text-slate-800">
                  {prospect.next_follow_up ? (
                    format(new Date(`${prospect.next_follow_up}T12:00:00`), "d MMMM yyyy", { locale: fr })
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={ui.label}>Nom du club *</label>
                <input
                  className={ui.input}
                  value={draft.club_name}
                  onChange={(e) => setDraft((d) => ({ ...d, club_name: e.target.value }))}
                />
              </div>
              <div>
                <label className={ui.label}>Sport</label>
                <input
                  className={ui.input}
                  value={draft.sport}
                  onChange={(e) => setDraft((d) => ({ ...d, sport: e.target.value }))}
                />
              </div>
              <div>
                <label className={ui.label}>Canton</label>
                <input
                  className={ui.input}
                  value={draft.canton}
                  onChange={(e) => setDraft((d) => ({ ...d, canton: e.target.value }))}
                />
              </div>
              <div>
                <label className={ui.label}>Ville</label>
                <input
                  className={ui.input}
                  value={draft.ville}
                  onChange={(e) => setDraft((d) => ({ ...d, ville: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={ui.label}>Fonction du contact</label>
                <input
                  className={ui.input}
                  value={draft.contact_function}
                  onChange={(e) => setDraft((d) => ({ ...d, contact_function: e.target.value }))}
                />
              </div>
              <div>
                <label className={ui.label}>Nom du contact</label>
                <input
                  className={ui.input}
                  value={draft.contact_name}
                  onChange={(e) => setDraft((d) => ({ ...d, contact_name: e.target.value }))}
                />
              </div>
              <div>
                <label className={ui.label}>Téléphone</label>
                <input
                  className={ui.input}
                  value={draft.phone}
                  onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className={ui.label}>Email</label>
                <input
                  className={ui.input}
                  value={draft.email}
                  onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={ui.label}>Site web</label>
                <input
                  className={ui.input}
                  value={draft.website}
                  onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={ui.label}>Statut</label>
                <select
                  className={ui.input}
                  value={draft.status}
                  onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as ProspectStatus }))}
                >
                  {PROSPECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        <section className={`${ui.card} p-5 sm:p-6`}>
          <h2 className={ui.h2}>Notes</h2>
          <textarea
            className={`${ui.input} mt-4 min-h-[140px] resize-y`}
            value={editMode ? draft.notes : notes}
            onChange={(e) => {
              const v = e.target.value;
              if (editMode) setDraft((d) => ({ ...d, notes: v }));
              else setNotes(v);
            }}
            placeholder="Notes libres sur ce prospect…"
          />
          <div className="mt-3 flex justify-end gap-2">
            {!editMode ? (
              <button type="button" className={ui.btnPrimary} disabled={pending} onClick={saveNotes}>
                Enregistrer
              </button>
            ) : null}
          </div>
        </section>
      </div>

      <section className={`${ui.card} p-5 sm:p-6`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className={ui.h2}>Historique</h2>
          {!editMode && canUndo ? (
            <button type="button" className={ui.btnDanger} onClick={undoLastAction}>
              <IconTrash className="h-4 w-4" />
              Annuler la dernière action
            </button>
          ) : null}
        </div>

        {activities.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Aucune action pour le moment.</p>
        ) : (
          <ol className="mt-5 space-y-0">
            {activities.map((a, idx) => {
              const showMenu = true; // menu disponible pour chaque action
              return (
                <li
                  key={a.id}
                  className="relative flex gap-4 pb-6 last:pb-0"
                  onMouseLeave={() => setActivityMenuId((v) => (v === a.id ? null : v))}
                >
                  {idx < activities.length - 1 ? (
                    <span className="absolute left-[7px] top-3 h-full w-px bg-slate-100" />
                  ) : null}
                  <span className="relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-blue-500 bg-white" />

                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{fmtDay(a.created_at)}</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-800">{a.title}</p>
                      </div>

                      {showMenu ? (
                        <div className="relative">
                          <button
                            type="button"
                            className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                            onClick={() => setActivityMenuId((v) => (v === a.id ? null : a.id))}
                            aria-label="Menu actions"
                          >
                            <IconDots className="h-4 w-4" />
                          </button>

                          {activityMenuOpen === a.id ? (
                            <div className="absolute right-0 top-9 z-20 w-44 rounded-2xl border border-[#e8eef6] bg-white p-2 shadow-xl">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => {
                                  setActivityMenuId(null);
                                  setActivityToEdit(a);
                                }}
                              >
                                <IconEdit className="h-4 w-4" />
                                Modifier
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                                onClick={() => {
                                  setActivityMenuId(null);
                                  setConfirm({
                                    tone: "danger",
                                    title: "Supprimer cette action de l’historique ?",
                                    description: "Cela supprimera l’entrée correspondante et recalculera le statut et la relance.",
                                    confirmLabel: "Supprimer",
                                    cancelLabel: "Annuler",
                                    onConfirm: () => {
                                      setConfirm(null);
                                      startTransition(async () => {
                                        const res = await fetch(
                                          `/api/prospects/${prospect.id}/activities/${a.id}`,
                                          { method: "DELETE" }
                                        );
                                        const data = await res.json();
                                        if (!res.ok) {
                                          setMsg(data.error ?? "Erreur.");
                                          return;
                                        }
                                        setMsg("Action supprimée.");
                                        await refreshAll();
                                      });
                                    },
                                  });
                                }}
                              >
                                <IconTrash className="h-4 w-4" />
                                Supprimer
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {a.description ? <p className="text-sm text-slate-500 whitespace-pre-wrap">{a.description}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <ConfirmModal
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        tone={confirm?.tone ?? "default"}
        confirmLabel={confirm?.confirmLabel ?? "Confirmer"}
        cancelLabel={confirm?.cancelLabel ?? "Annuler"}
        onConfirm={() => confirm?.onConfirm?.()}
        onCancel={() => setConfirm(null)}
      />

      {activityToEdit ? (
        <ProspectActivityEditorModal
          open={Boolean(activityToEdit)}
          activity={activityToEdit}
          prospectId={prospect.id}
          onClose={() => setActivityToEdit(null)}
          onSaved={refreshAll}
        />
      ) : null}
    </div>
  );
}

