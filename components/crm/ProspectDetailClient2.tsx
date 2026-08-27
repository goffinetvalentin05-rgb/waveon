"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  IconArchive,
  IconArrowLeft,
  IconCalendarEvent,
  IconDots,
  IconEdit,
  IconMail,
  IconPhone,
  IconPresentation,
  IconTrash,
  IconUserCheck,
  IconUserX,
} from "@tabler/icons-react";
import { isClosedProspectStatus, isDemoScheduledStatus } from "@/lib/crm/closed";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { StatusSelect } from "@/components/crm/StatusSelect";
import { InteractionForm } from "@/components/crm/InteractionForm";
import { ProspectContactsPanel } from "@/components/crm/ProspectContactsPanel";
import { ProspectLinkedTasks } from "@/components/crm/ProspectLinkedTasks";
import { ClosedReasonModal } from "@/components/crm/ClosedReasonModal";
import { QUICK_ACTION_LABELS } from "@/lib/crm/actions";
import type {
  Prospect,
  ProspectActivity,
  QuickAction,
  ProspectStatus,
  ActionType,
} from "@/lib/crm/types";
import { INTERACTION_LABELS, isProspectStatus, type InteractionType } from "@/lib/crm/types";
import { formatClosedReason, type ClosedReason } from "@/lib/crm/closed";
import { parseStatusChangePayload } from "@/lib/crm/status";
import { ui } from "@/lib/design/tokens";
import { formatRelativeDay } from "@/lib/crm/format";
import { isContactActivity, followUpDateLabel } from "@/lib/crm/next-action";

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

function lastContactAt(prospect: Prospect, activities: ProspectActivity[]): string | null {
  const last = activities.find((a) => isContactActivity(a.action_type));
  return last?.occurred_at || last?.created_at || prospect.last_action_at;
}

function lastContactCaption(prospect: Prospect, activities: ProspectActivity[]): string {
  const last = activities.find((a) => isContactActivity(a.action_type));
  let kind: string | null = null;
  let channel: string | null = null;
  if (last) {
    kind =
      last.action_type in QUICK_ACTION_LABELS
        ? QUICK_ACTION_LABELS[last.action_type as QuickAction]
        : INTERACTION_LABELS[last.action_type as InteractionType] ?? last.title.split(" — ")[0];
    channel = last.channel || null;
  }

  const rawOutcome = prospect.last_action?.replace(/^Statut\s*:\s*/i, "").trim() || null;
  const outcome =
    rawOutcome && !isProspectStatus(rawOutcome) && rawOutcome !== kind ? rawOutcome : null;
  const extra = outcome || channel;

  if (kind && extra && extra !== kind) return `${kind} · ${extra}`;
  if (kind) return kind;
  if (rawOutcome && !isProspectStatus(rawOutcome)) return rawOutcome;
  return "—";
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
        className={ui.overlay}
        onClick={onCancel}
        aria-label="Fermer"
      />
      <div className={`${ui.modal} max-w-lg p-6`}>
        <h3 className="text-lg font-semibold text-wo-text">{title}</h3>
        {description ? (
          <p className="mt-2 text-sm text-wo-muted whitespace-pre-line">{description}</p>
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

function DeleteProspectModal({
  open,
  clubName,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  clubName: string;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (confirmClubName: string) => void;
}) {
  if (!open) return null;
  return (
    <DeleteProspectModalInner
      key={clubName}
      clubName={clubName}
      loading={loading}
      error={error}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

function DeleteProspectModalInner({
  clubName,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  clubName: string;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (confirmClubName: string) => void;
}) {
  const [typed, setTyped] = useState("");
  const matches = typed === clubName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className={ui.overlay}
        onClick={loading ? undefined : onCancel}
        aria-label="Fermer"
      />
      <div className={`${ui.modal} max-w-lg p-6`}>
        <h3 className="text-lg font-semibold text-wo-text">Supprimer ce prospect ?</h3>
        <p className="mt-2 text-sm text-wo-muted">
          Cette action supprimera définitivement ce prospect ainsi que son historique, ses notes, ses
          tâches et ses relances associées. Cette action est irréversible.
        </p>
        <p className="mt-3 text-sm font-medium text-wo-text">
          {clubName} sera définitivement supprimé.
        </p>
        <div className="mt-5">
          <label className={ui.label}>Saisissez {clubName} pour confirmer.</label>
          <input
            className={ui.input}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={clubName}
            disabled={loading}
            autoFocus
          />
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onCancel} disabled={loading}>
            Annuler
          </button>
          <button
            type="button"
            className={ui.btnDanger}
            disabled={!matches || loading}
            onClick={() => onConfirm(typed)}
          >
            {loading ? "Suppression…" : "Supprimer définitivement"}
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
      <dt className="text-wo-dim">{label}</dt>
      <dd className="text-right font-medium text-wo-text">
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
                className="text-wo-accent hover:underline"
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
                className="text-wo-accent hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  onStart();
                }}
              >
                {value}
              </a>
            ) : (
              <span
                className="cursor-pointer hover:text-wo-accent"
                onClick={() => onStart()}
              >
                {value}
              </span>
            )}
            <button
              type="button"
              className="rounded-xl p-2 text-wo-dim hover:bg-wo-hover hover:text-wo-secondary"
              onClick={onStart}
              aria-label={`Modifier ${label}`}
            >
              <IconEdit className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <span
              className="cursor-pointer text-wo-dim hover:text-wo-accent"
              onClick={() => onStart()}
            >
              —
            </span>
            <button
              type="button"
              className="rounded-xl p-2 text-wo-dim hover:bg-wo-hover hover:text-wo-secondary"
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
      const parsed = parseStatusChangePayload(activity.description);
      return {
        action_type: "status_change",
        action_date,
        note: parsed.closed_note ?? "",
        to_status: parsed.to ?? "À contacter",
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
        className={ui.overlay}
        onClick={onClose}
      />
      <div className={`${ui.modal} max-w-2xl p-6`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-wo-text">Modifier l’action</h3>
            <p className="mt-1 text-sm text-wo-muted">{activity.title}</p>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 text-wo-muted hover:bg-wo-hover hover:text-wo-secondary"
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
              <StatusSelect
                value={state.to_status}
                onChange={(to_status) => setState((s) => ({ ...s, to_status }))}
              />
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
  const searchParams = useSearchParams();
  const clientsHref = initial.project_id
    ? `/projects/${initial.project_id}/clients`
    : "/crm/clients";
  const prospectsHref = initial.project_id
    ? `/projects/${initial.project_id}/prospects`
    : "/crm/prospects";
  const backHref = (() => {
    const back = searchParams.get("back");
    if (
      back?.startsWith("/crm/prospects") ||
      back?.startsWith("/crm/clients") ||
      back?.startsWith("/prospects") ||
      back?.startsWith("/clients") ||
      back?.startsWith("/projects/")
    ) {
      return back
        .replace(/^\/prospects/, "/crm/prospects")
        .replace(/^\/clients/, "/crm/clients");
    }
    return initial.status === "Client" ? clientsHref : prospectsHref;
  })();
  const backLabel = backHref.includes("/clients") ? "Clients" : "Prospects";
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
    logo_url: initial.logo_url ?? "",
    address: initial.address ?? "",
    country: initial.country ?? "",
    linkedin_url: initial.linkedin_url ?? "",
    source: initial.source ?? "",
    priority: initial.priority ?? "Normale",
    notes: initial.notes ?? "",
    status: initial.status as ProspectStatus,
    potential_value: initial.potential_value != null ? String(initial.potential_value) : "",
    contact_channel: initial.contact_channel ?? "",
    tags: (initial.tags ?? []).join(", "),
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
  const [closePrompt, setClosePrompt] = useState<"status" | "refus" | "draft" | null>(null);

  const editableActions = useMemo(() => {
    return new Set<ActionType>(["mail_sent", "call_made", "demo_scheduled", "client", "refus", "status_change"]);
  }, []);

  const [activityMenuId, setActivityMenuId] = useState<string | null>(null);
  const [activityToEdit, setActivityToEdit] = useState<ProspectActivity | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

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

  const goToClientsList = () => {
    router.push(clientsHref);
    router.refresh();
  };

  const executeQuickAction = (action: QuickAction, extra?: { closed_reason?: string; closed_note?: string }) => {
    setMsg(null);
    startTransition(async () => {
      const res = await fetch(`/api/prospects/${prospect.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Erreur");
        return;
      }
      if (action === "client") {
        goToClientsList();
        return;
      }
      setMsg(`${QUICK_ACTION_LABELS[action]} — enregistré.`);
      await refreshAll();
    });
  };

  const applyStatus = (next: ProspectStatus, extra?: { closed_reason?: string; closed_note?: string }) => {
    startTransition(async () => {
      const res = await fetch(`/api/prospects/${prospect.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Erreur.");
        return;
      }
      if (next === "Client") {
        goToClientsList();
        return;
      }
      setMsg("Statut mis à jour.");
      setProspect(data.prospect as Prospect);
      setActivities(data.activities as ProspectActivity[]);
      await refreshAll();
    });
  };

  const runAction = (action: QuickAction) => {
    if (action === "client") {
      setConfirm({
        tone: "default",
        title: "Passer en client ?",
        description: `${prospect.club_name} quittera Prospects et apparaîtra dans Clients. Toutes les informations et l’historique sont conservés.`,
        confirmLabel: "Passer en client",
        cancelLabel: "Annuler",
        onConfirm: () => {
          setConfirm(null);
          executeQuickAction("client");
        },
      });
      return;
    }
    if (action === "refus") {
      setClosePrompt("refus");
      return;
    }
    executeQuickAction(action);
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

  const saveInlineField = (field: string, value: string) => {
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

  const handleSaveDraft = (extra?: { closed_reason?: string; closed_note?: string }) => {
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
        logo_url: draft.logo_url,
        address: draft.address,
        country: draft.country,
        linkedin_url: draft.linkedin_url,
        source: draft.source,
        priority: draft.priority,
        notes: draft.notes,
        potential_value: draft.potential_value === "" ? null : Number(draft.potential_value),
        contact_channel: draft.contact_channel,
        tags: draft.tags,
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
          body: JSON.stringify({ status: nextStatus, ...extra }),
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
      if (nextStatus === "Client") {
        goToClientsList();
        return;
      }
      await refreshAll();
    };

    if (nextStatus === "Fermé" && nextStatus !== originalStatus && !extra?.closed_reason) {
      setClosePrompt("draft");
      return;
    }
    if (isClosedProspectStatus(nextStatus) && nextStatus !== originalStatus && nextStatus !== "Fermé") {
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

  const isArchived = Boolean(prospect.archived_at);
  const hasHistoryOrNotes =
    activities.some((a) => a.action_type !== "created" && a.action_type !== "imported") ||
    Boolean(prospect.notes?.trim());

  const archiveProspect = () => {
    setErrorMsg(null);
    setConfirm({
      tone: "default",
      title: "Archiver ce prospect ?",
      description: `${prospect.club_name} sera retiré de la liste principale. Son historique et ses notes seront conservés. Vous pourrez le restaurer plus tard.`,
      confirmLabel: "Archiver",
      cancelLabel: "Annuler",
      onConfirm: () => {
        setConfirm(null);
        setArchiveLoading(true);
        startTransition(async () => {
          const res = await fetch(`/api/prospects/${prospect.id}/archive`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ archived: true }),
          });
          const data = await res.json();
          setArchiveLoading(false);
          if (!res.ok) {
            setErrorMsg(data.error ?? "Impossible d’archiver ce prospect.");
            return;
          }
          setMsg(data.message ?? "Le prospect a été archivé.");
          setProspect(data.prospect as Prospect);
          if (data.activities) setActivities(data.activities as ProspectActivity[]);
          router.refresh();
        });
      },
    });
  };

  const restoreProspect = () => {
    setErrorMsg(null);
    setArchiveLoading(true);
    startTransition(async () => {
      const res = await fetch(`/api/prospects/${prospect.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });
      const data = await res.json();
      setArchiveLoading(false);
      if (!res.ok) {
        setErrorMsg(data.error ?? "Impossible de restaurer ce prospect.");
        return;
      }
      setMsg(data.message ?? "Le prospect a été restauré.");
      setProspect(data.prospect as Prospect);
      if (data.activities) setActivities(data.activities as ProspectActivity[]);
      router.refresh();
    });
  };

  const deleteProspect = async (confirmClubName: string) => {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm_club_name: confirmClubName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? "Impossible de supprimer ce prospect.");
        setDeleteLoading(false);
        return;
      }
      setShowDeleteModal(false);
      setMsg("Le prospect a été supprimé.");
      router.push(
        backHref.includes("/prospects") || backHref.includes("/clients")
          ? backHref
          : "/crm/prospects"
      );
      router.refresh();
    } catch {
      setDeleteError("Une erreur réseau est survenue. Réessayez.");
      setDeleteLoading(false);
    }
  };

  const statusSelector = (
    <StatusSelect
      value={prospect.status}
      className={ui.input + " w-64"}
      onChange={(next) => {
        if (next === prospect.status) return;

        if (next === "Fermé") {
          setClosePrompt("status");
          return;
        }

        if (next === "Client") {
          setConfirm({
            tone: "default",
            title: "Confirmer le changement de statut ?",
            description: `Passer le statut à « ${next} ».`,
            confirmLabel: "Confirmer",
            cancelLabel: "Annuler",
            onConfirm: () => {
              setConfirm(null);
              applyStatus(next);
            },
          });
          return;
        }

        applyStatus(next);
      }}
    />
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
    ...(prospect.status === "Client"
      ? []
      : [
          {
            key: "client" as const,
            label: "Passer en client",
            icon: <IconUserCheck className="h-4 w-4" />,
            className:
              "inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100",
          },
        ]),
          {
            key: "refus" as const,
            label: "Fermer",
            icon: <IconUserX className="h-4 w-4" />,
            className: ui.btnDanger,
          },
  ];

  const addDemoToCalendar = async () => {
    setCalendarLoading(true);
    setMsg(null);
    setErrorMsg(null);
    try {
      const day = prospect.demo_at
        ? new Date(prospect.demo_at).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const start_at = `${day}T10:00:00`;
      const end_at = `${day}T11:00:00`;
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Démo — ${prospect.club_name}`,
          category: "demo",
          start_at,
          end_at,
          all_day: false,
          description: prospect.notes ?? undefined,
          location: prospect.ville ?? undefined,
          source: "crm",
          source_id: prospect.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Impossible d'ajouter au calendrier");
        return;
      }
      setMsg(
        data.deduped
          ? "Cette démonstration est déjà dans le calendrier."
          : "Démonstration ajoutée au calendrier."
      );
    } catch {
      setErrorMsg("Impossible d'ajouter au calendrier");
    } finally {
      setCalendarLoading(false);
    }
  };

  const showAddToCalendar =
    !isArchived &&
    (Boolean(prospect.demo_at) || isDemoScheduledStatus(prospect.status));

  const followUpLabel = followUpDateLabel(prospect.status);
  const showFollowUpDate =
    Boolean(followUpLabel) && !(prospect.status === "Démo" && prospect.demo_at);

  const canUndo = activities.some((a) => editableActions.has(a.action_type));

  const activityMenuOpen = activityMenuId;

  return (
    <div className="space-y-6 crm-animate-in">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-wo-muted hover:text-wo-text"
        >
          <IconArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className={ui.h1}>{prospect.club_name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={prospect.status} />
              {prospect.status === "Fermé" && formatClosedReason(prospect.closed_reason, prospect.closed_note) ? (
                <span className="text-sm text-wo-muted">
                  {formatClosedReason(prospect.closed_reason, prospect.closed_note)}
                </span>
              ) : null}
              {isArchived ? (
                <span className="crm-badge bg-wo-hover text-wo-muted">
                  <span className="crm-badge-dot bg-slate-400" />
                  Archivé
                </span>
              ) : null}
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
                  onClick={() => handleSaveDraft()}
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
                    logo_url: prospect.logo_url ?? "",
                    address: prospect.address ?? "",
                    country: prospect.country ?? "",
                    linkedin_url: prospect.linkedin_url ?? "",
                    source: prospect.source ?? "",
                    priority: prospect.priority ?? "Normale",
                    notes: prospect.notes ?? "",
                    status: prospect.status,
                    potential_value: prospect.potential_value != null ? String(prospect.potential_value) : "",
                    contact_channel: prospect.contact_channel ?? "",
                    tags: (prospect.tags ?? []).join(", "),
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
        <p className={ui.alertInfo}>
          {msg}
        </p>
      ) : null}

      {errorMsg ? (
        <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {errorMsg}
        </p>
      ) : null}

      <section className={`${ui.card} p-5 sm:p-6`}>
        <h2 className={ui.h2}>Suivi</h2>
        <div
          className={`mt-4 grid gap-4 ${
            showFollowUpDate ? "md:grid-cols-3" : "md:grid-cols-2"
          }`}
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-wo-dim">Dernier contact</p>
            <p className="mt-1 text-sm text-wo-text">{formatRelativeDay(lastContactAt(prospect, activities))}</p>
            <p className="text-xs text-wo-muted">{lastContactCaption(prospect, activities)}</p>
          </div>
          {showFollowUpDate ? (
            <div>
              <label className="text-[11px] uppercase tracking-[0.08em] text-wo-dim">
                {followUpLabel}
              </label>
              <input
                type="date"
                className={`${ui.input} mt-1`}
                value={prospect.next_follow_up ?? ""}
                disabled={isArchived}
                onChange={(e) => {
                  const value = e.target.value;
                  setProspect((p) => ({ ...p, next_follow_up: value || null }));
                  saveInlineField("next_follow_up", value);
                }}
              />
            </div>
          ) : null}
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-wo-dim">Responsable</p>
            <p className="mt-1 text-sm text-wo-text">{prospect.assignee?.name ?? "—"}</p>
          </div>
        </div>
      </section>

      <section className={`${ui.card} p-5 sm:p-6`}>
        <h2 className={ui.h2}>Actions rapides</h2>
        {isArchived ? (
          <p className="mt-3 text-sm text-wo-muted">
            Ce prospect est archivé. Restaurez-le pour enregistrer de nouvelles actions.
          </p>
        ) : (
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
            {showAddToCalendar ? (
              <button
                type="button"
                disabled={pending || calendarLoading}
                className={ui.btnSecondary}
                onClick={() => void addDemoToCalendar()}
              >
                <IconCalendarEvent className="h-4 w-4" />
                {calendarLoading ? "Ajout…" : "Ajouter au calendrier"}
              </button>
            ) : null}
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={`${ui.card} p-5 sm:p-6`}>
          <h2 className={ui.h2}>Informations générales</h2>

          {!editMode ? (
            <dl className="mt-4 space-y-0 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
                <dt className="text-wo-dim">Secteur</dt>
                <dd className="text-right font-medium text-wo-text">{prospect.sport ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
                <dt className="text-wo-dim">Canton</dt>
                <dd className="text-right font-medium text-wo-text">{prospect.canton ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
                <dt className="text-wo-dim">Pays</dt>
                <dd className="text-right font-medium text-wo-text">{prospect.country ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
                <dt className="text-wo-dim">Adresse</dt>
                <dd className="text-right font-medium text-wo-text">{prospect.address ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
                <dt className="text-wo-dim">Fonction du contact</dt>
                <dd className="text-right font-medium text-wo-text">{prospect.contact_function ?? "—"}</dd>
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
                <dt className="text-wo-dim">Site web</dt>
                <dd className="text-right font-medium text-wo-text">
                  {prospect.website ? (
                    <a
                      href={prospect.website.startsWith("http") ? prospect.website : `https://${prospect.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-wo-accent hover:underline"
                    >
                      {prospect.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>

              <div className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
                <dt className="text-wo-dim">LinkedIn</dt>
                <dd className="text-right font-medium text-wo-text">
                  {prospect.linkedin_url ? (
                    <a
                      href={prospect.linkedin_url.startsWith("http") ? prospect.linkedin_url : `https://${prospect.linkedin_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-wo-accent hover:underline"
                    >
                      {prospect.linkedin_url}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>

              <div className="flex justify-between gap-4 border-b border-wo-border pb-2">
                <dt className="text-wo-dim">Source</dt>
                <dd className="text-right font-medium text-wo-text">{prospect.source ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-wo-border pb-2">
                <dt className="text-wo-dim">Priorité</dt>
                <dd className="text-right font-medium text-wo-text">{prospect.priority ?? "Normale"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-wo-border pb-2">
                <dt className="text-wo-dim">Valeur potentielle</dt>
                <dd className="text-right font-medium text-wo-text">
                  {prospect.potential_value != null
                    ? new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(
                        Number(prospect.potential_value)
                      )
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-wo-border pb-2">
                <dt className="text-wo-dim">Canal</dt>
                <dd className="text-right font-medium text-wo-text">{prospect.contact_channel ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-wo-border pb-2 last:border-0">
                <dt className="text-wo-dim">Tags</dt>
                <dd className="text-right font-medium text-wo-text">
                  {(prospect.tags ?? []).length ? prospect.tags.join(", ") : "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={ui.label}>Organisation *</label>
                <input
                  className={ui.input}
                  value={draft.club_name}
                  onChange={(e) => setDraft((d) => ({ ...d, club_name: e.target.value }))}
                />
              </div>
              <div>
                <label className={ui.label}>Secteur</label>
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
                <label className={ui.label}>Adresse</label>
                <input
                  className={ui.input}
                  value={draft.address}
                  onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                />
              </div>
              <div>
                <label className={ui.label}>Pays</label>
                <input
                  className={ui.input}
                  value={draft.country}
                  onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
                />
              </div>
              <div>
                <label className={ui.label}>LinkedIn</label>
                <input
                  className={ui.input}
                  value={draft.linkedin_url}
                  onChange={(e) => setDraft((d) => ({ ...d, linkedin_url: e.target.value }))}
                />
              </div>
              <div>
                <label className={ui.label}>Source</label>
                <input
                  className={ui.input}
                  value={draft.source}
                  onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
                />
              </div>
              <div>
                <label className={ui.label}>Priorité</label>
                <select
                  className={ui.input}
                  value={draft.priority}
                  onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value as typeof d.priority }))}
                >
                  {["Faible", "Normale", "Haute", "Urgente"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
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
                <label className={ui.label}>Logo (URL)</label>
                <input
                  className={ui.input}
                  value={draft.logo_url}
                  onChange={(e) => setDraft((d) => ({ ...d, logo_url: e.target.value }))}
                  placeholder="https://…"
                />
              </div>
              <div>
                <label className={ui.label}>Valeur potentielle (CHF)</label>
                <input
                  className={ui.input}
                  value={draft.potential_value}
                  onChange={(e) => setDraft((d) => ({ ...d, potential_value: e.target.value }))}
                />
              </div>
              <div>
                <label className={ui.label}>Canal</label>
                <input
                  className={ui.input}
                  value={draft.contact_channel}
                  onChange={(e) => setDraft((d) => ({ ...d, contact_channel: e.target.value }))}
                />
              </div>
              <div>
                <label className={ui.label}>Tags</label>
                <input
                  className={ui.input}
                  value={draft.tags}
                  onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
                  placeholder="séparés par des virgules"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={ui.label}>Statut</label>
                <StatusSelect
                  value={draft.status}
                  onChange={(status) => setDraft((d) => ({ ...d, status }))}
                />
              </div>
            </div>
          )}
        </section>

        <ProspectContactsPanel prospectId={prospect.id} onChanged={() => void refreshAll()} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
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
        <ProspectLinkedTasks prospectId={prospect.id} projectId={prospect.project_id} />
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

        <InteractionForm
          prospectId={prospect.id}
          currentStatus={prospect.status}
          defaultChannel={prospect.contact_channel}
          onAdded={() => void refreshAll()}
        />

        {activities.length === 0 ? (
          <p className="mt-4 text-sm text-wo-dim">Aucune action pour le moment.</p>
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
                    <span className="absolute left-[7px] top-3 h-full w-px bg-wo-hover" />
                  ) : null}
                  <span className="relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-indigo-500 bg-white" />

                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-wo-dim">
                          {fmtDay(a.occurred_at || a.created_at)}
                          {a.channel ? ` · ${a.channel}` : ""}
                          {a.action_type in INTERACTION_LABELS
                            ? ` · ${INTERACTION_LABELS[a.action_type as InteractionType]}`
                            : ""}
                          {a.actor_name ? ` · ${a.actor_name}` : ""}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-wo-text">{a.title}</p>
                      </div>

                      {showMenu ? (
                        <div className="relative">
                          <button
                            type="button"
                            className="rounded-xl p-2 text-wo-dim hover:bg-wo-hover hover:text-wo-secondary"
                            onClick={() => setActivityMenuId((v) => (v === a.id ? null : a.id))}
                            aria-label="Menu actions"
                          >
                            <IconDots className="h-4 w-4" />
                          </button>

                          {activityMenuOpen === a.id ? (
                            <div className="absolute right-0 top-9 z-20 w-44 rounded-[12px] border border-wo-border bg-white p-2 shadow-lg">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-wo-secondary hover:bg-wo-hover"
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

                    {a.description ? <p className="text-sm text-wo-muted whitespace-pre-wrap">{a.description}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="rounded-2xl border border-rose-100 bg-rose-50/40 p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight text-rose-900">Zone dangereuse</h2>
        <p className="mt-1 text-sm text-rose-800/80">
          {isArchived
            ? "Ce prospect est archivé. Vous pouvez le restaurer ou le supprimer définitivement."
            : hasHistoryOrNotes
              ? "Ce prospect a déjà un historique ou des notes. Préférez l’archivage si vous voulez conserver ces informations."
              : "Archiver retire le prospect de la liste. Supprimer efface toutes les données liées."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {isArchived ? (
            <button
              type="button"
              className={ui.btnSecondary}
              disabled={pending || archiveLoading || deleteLoading}
              onClick={restoreProspect}
            >
              <IconArchive className="h-4 w-4" stroke={1.75} />
              {archiveLoading ? "Restauration…" : "Restaurer le prospect"}
            </button>
          ) : (
            <button
              type="button"
              className={ui.btnSecondary}
              disabled={pending || archiveLoading || deleteLoading}
              onClick={archiveProspect}
            >
              <IconArchive className="h-4 w-4" stroke={1.75} />
              {archiveLoading ? "Archivage…" : "Archiver le prospect"}
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            disabled={pending || archiveLoading || deleteLoading}
            onClick={() => {
              setDeleteError(null);
              setShowDeleteModal(true);
            }}
          >
            <IconTrash className="h-4 w-4" stroke={1.75} />
            Supprimer le prospect
          </button>
        </div>
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

      <ClosedReasonModal
        key={closePrompt ?? "close-reason"}
        open={Boolean(closePrompt)}
        clubName={prospect.club_name}
        onConfirm={(reason: ClosedReason, note: string) => {
          const kind = closePrompt;
          setClosePrompt(null);
          const extra = { closed_reason: reason, closed_note: note };
          if (kind === "refus") executeQuickAction("refus", extra);
          else if (kind === "draft") handleSaveDraft(extra);
          else applyStatus("Fermé", extra);
        }}
        onCancel={() => setClosePrompt(null)}
      />

      <DeleteProspectModal
        open={showDeleteModal}
        clubName={prospect.club_name}
        loading={deleteLoading}
        error={deleteError}
        onCancel={() => {
          if (deleteLoading) return;
          setShowDeleteModal(false);
          setDeleteError(null);
        }}
        onConfirm={(name) => {
          void deleteProspect(name);
        }}
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

