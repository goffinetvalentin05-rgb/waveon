"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import {
  IconArchive,
  IconArrowLeft,
  IconBrandLinkedin,
  IconChevronDown,
  IconDots,
  IconEdit,
  IconMail,
  IconMessage,
  IconPhone,
  IconPlus,
  IconPresentation,
  IconCircleCheck,
  IconTrash,
  IconUserCheck,
  IconUserPlus,
  IconUserX,
  IconCalendarEvent,
  IconChecklist,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react";
import { isClosedProspectStatus, isDemoScheduledStatus } from "@/lib/crm/closed";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { StatusSelect } from "@/components/crm/StatusSelect";
import { ProspectContactsPanel } from "@/components/crm/ProspectContactsPanel";
import { ProspectBusinessFields } from "@/components/crm/ProspectBusinessFields";
import { ProspectLinkedTasks } from "@/components/crm/ProspectLinkedTasks";
import { ClosedReasonModal } from "@/components/crm/ClosedReasonModal";
import { InteractionModal } from "@/components/crm/InteractionModal";
import { MeetingComposer } from "@/components/crm/MeetingComposer";
import { ProspectMeetingsPanel } from "@/components/crm/ProspectMeetingsPanel";
import { ScheduleDemoModal } from "@/components/crm/ScheduleDemoModal";
import { ProspectFollowUpCard } from "@/components/crm/ProspectFollowUpCard";
import { ProspectTimeline } from "@/components/crm/ProspectTimeline";
import { QUICK_ACTION_LABELS } from "@/lib/crm/actions";
import {
  businessFormToApiPayload,
  prospectToBusinessForm,
  type ProspectBusinessFormValues,
} from "@/lib/crm/prospect-fields";
import type {
  Prospect,
  ProspectActivity,
  QuickAction,
  ProspectStatus,
} from "@/lib/crm/types";
import { formatClosedReason, type ClosedReason } from "@/lib/crm/closed";
import { parseStatusChangePayload } from "@/lib/crm/status";
import { ui } from "@/lib/design/tokens";
import { lastCommercialActivity } from "@/lib/crm/activity-display";
import { defaultInteractionKindForStage, type InteractionChannel } from "@/lib/crm/interactions";
import type { ProspectMeeting } from "@/lib/crm/meetings";

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
                ? "inline-flex items-center justify-center rounded-full border border-rose-400/25 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
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
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
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

function asHref(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

function InfoField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="wo-detail-field">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-wo-dim">{label}</p>
      <div className="mt-1.5 text-[13.5px] font-medium text-wo-text break-words">{children}</div>
    </div>
  );
}

type ActivityEditState = {
  action_type: "mail_sent" | "call_made" | "demo_scheduled" | "demo_done" | "client" | "refus" | "status_change";
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
    if (activity.action_type === "demo_scheduled" || activity.action_type === "demo_done") {
      const parsed = parseDemoEditDescription(activity.description);
      return {
        action_type: activity.action_type,
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
      if (state.action_type === "demo_scheduled" || state.action_type === "demo_done") {
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
              <option value="demo_done">Démo effectuée</option>
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

          {state.action_type === "demo_scheduled" || state.action_type === "demo_done" ? (
            <div>
              <label className={ui.label}>
                {state.action_type === "demo_done" ? "Date de la démo" : "Date prévue démo"}
              </label>
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

  useEffect(() => {
    if (!msg) return;
    const timer = window.setTimeout(() => setMsg(null), 4000);
    return () => window.clearTimeout(timer);
  }, [msg]);

  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(() => ({
    ...prospectToBusinessForm(initial),
    notes: initial.notes ?? "",
    status: initial.status as ProspectStatus,
  }));

  const enterEditMode = () => {
    setDraft({
      ...prospectToBusinessForm(prospect),
      notes: prospect.notes ?? "",
      status: prospect.status as ProspectStatus,
    });
    setEditMode(true);
    setMsg(null);
  };

  const [confirm, setConfirm] = useState<{
    title: string;
    description?: string;
    tone?: ConfirmTone;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
  } | null>(null);
  const [closePrompt, setClosePrompt] = useState<"status" | "refus" | "draft" | null>(null);

  const [activityToEdit, setActivityToEdit] = useState<ProspectActivity | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [interactionChannel, setInteractionChannel] = useState<InteractionChannel | null>(null);
  const [interactionSaving, setInteractionSaving] = useState(false);
  const [scheduleDemoOpen, setScheduleDemoOpen] = useState(false);
  const [scheduleDemoSaving, setScheduleDemoSaving] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [addContactKey, setAddContactKey] = useState(0);
  const [taskCreateKey, setTaskCreateKey] = useState(0);
  const [contactCount, setContactCount] = useState(initial.contact_count ?? 0);
  const [notesEditing, setNotesEditing] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetings, setMeetings] = useState<ProspectMeeting[]>([]);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [moreOpen]);

  const refreshMeetings = async () => {
    const res = await fetch(`/api/prospects/${prospect.id}/meetings`);
    const json = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(json.meetings)) setMeetings(json.meetings);
  };

  const refreshAll = async () => {
    const refreshed = await fetch(`/api/prospects/${prospect.id}`);
    const json = await refreshed.json();
    if (refreshed.ok) {
      setProspect(json.prospect as Prospect);
      setActivities(json.activities as ProspectActivity[]);
      setNotes((json.prospect as Prospect).notes ?? "");
    }
    await refreshMeetings();
    router.refresh();
  };

  useEffect(() => {
    void refreshMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospect.id]);

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

  const saveInteraction = async (payload: {
    channel: InteractionChannel;
    kind: string;
    description: string;
    occurredAt: string;
  }) => {
    if (interactionSaving) return;
    setInteractionSaving(true);
    setMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: payload.channel,
          interaction_type: payload.kind,
          description: payload.description,
          occurred_at: payload.occurredAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Impossible d'enregistrer l'interaction.");
        return;
      }
      if (data.prospect) setProspect(data.prospect as Prospect);
      if (data.activities) setActivities(data.activities as ProspectActivity[]);
      setInteractionChannel(null);
      setMsg("Interaction enregistrée.");
      await refreshAll();
    } catch {
      setErrorMsg("Impossible d'enregistrer l'interaction.");
    } finally {
      setInteractionSaving(false);
    }
  };

  const applyStatus = (next: ProspectStatus, extra?: { closed_reason?: string; closed_note?: string }) => {
    const previous = prospect.status as ProspectStatus;
    startTransition(async () => {
      setProspect((p) => ({ ...p, status: next }));
      setMsg(null);
      setErrorMsg(null);
      const res = await fetch(`/api/prospects/${prospect.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProspect((p) => ({ ...p, status: previous }));
        setErrorMsg(
          typeof data.error === "string" ? data.error : "Impossible d’enregistrer le statut."
        );
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
    if (action === "demo_scheduled") {
      setScheduleDemoOpen(true);
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
      const { notes, status, ...business } = draft;
      void status;
      const patchBody = {
        ...businessFormToApiPayload(business as ProspectBusinessFormValues),
        notes,
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
      className={ui.input + " w-full lg:w-[min(16rem,100%)]"}
      disabled={pending || interactionSaving}
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

  const saveScheduleDemo = async (payload: {
    demo_date: string;
    demo_time: string;
    duration_min: number;
    reminder_preset: string;
    reminder_date: string | null;
    note: string;
  }) => {
    if (scheduleDemoSaving) return;
    setScheduleDemoSaving(true);
    setMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/demo-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Impossible de planifier la démo.");
        return;
      }
      if (data.prospect) setProspect(data.prospect as Prospect);
      if (data.activities) setActivities(data.activities as ProspectActivity[]);
      setScheduleDemoOpen(false);
      setMsg("Démonstration planifiée.");
      await refreshAll();
    } catch {
      setErrorMsg("Impossible de planifier la démo.");
    } finally {
      setScheduleDemoSaving(false);
    }
  };

  const cancelScheduledDemo = async () => {
    if (scheduleDemoSaving) return;
    setScheduleDemoSaving(true);
    setMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/demo-schedule`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Impossible d’annuler la démo.");
        return;
      }
      if (data.prospect) setProspect(data.prospect as Prospect);
      if (data.activities) setActivities(data.activities as ProspectActivity[]);
      setScheduleDemoOpen(false);
      setMsg("Démonstration annulée.");
      await refreshAll();
    } catch {
      setErrorMsg("Impossible d’annuler la démo.");
    } finally {
      setScheduleDemoSaving(false);
    }
  };

  const canUndo = lastCommercialActivity(activities) != null;
  const busy = pending || interactionSaving || scheduleDemoSaving;
  const notesValue = editMode ? draft.notes : notes;
  const hasNotes = Boolean(notesValue.trim());
  const contextLine = [prospect.project?.name, prospect.sport, prospect.ville || prospect.canton]
    .filter(Boolean)
    .join(" · ");

  const primaryInfo = [
    prospect.sport ? { label: "Secteur", node: prospect.sport } : null,
    prospect.canton ? { label: "Canton / région", node: prospect.canton } : null,
    prospect.ville ? { label: "Ville", node: prospect.ville } : null,
    prospect.country ? { label: "Pays", node: prospect.country } : null,
    prospect.address ? { label: "Adresse", node: prospect.address } : null,
    prospect.website
      ? {
          label: "Site web",
          node: (
            <a href={asHref(prospect.website)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-wo-accent hover:underline">
              <IconWorld className="h-3.5 w-3.5" />
              {prospect.website}
            </a>
          ),
        }
      : null,
    prospect.linkedin_url
      ? {
          label: "LinkedIn",
          node: (
            <a href={asHref(prospect.linkedin_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-wo-accent hover:underline">
              <IconBrandLinkedin className="h-3.5 w-3.5" />
              Profil
            </a>
          ),
        }
      : null,
    prospect.phone
      ? {
          label: "Téléphone",
          node: (
            <a href={`tel:${prospect.phone}`} className="text-wo-accent hover:underline">
              {prospect.phone}
            </a>
          ),
        }
      : null,
    prospect.email
      ? {
          label: "Email",
          node: (
            <a href={`mailto:${prospect.email}`} className="text-wo-accent hover:underline">
              {prospect.email}
            </a>
          ),
        }
      : null,
  ].filter(Boolean) as { label: string; node: ReactNode }[];

  const secondaryInfo = [
    prospect.contact_name ? { label: "Nom du contact", node: prospect.contact_name } : null,
    prospect.contact_function ? { label: "Fonction", node: prospect.contact_function } : null,
    prospect.source ? { label: "Source", node: prospect.source } : null,
    (prospect.tags ?? []).length ? { label: "Tags", node: prospect.tags.join(", ") } : null,
  ].filter(Boolean) as { label: string; node: ReactNode }[];

  return (
    <div className={`space-y-3 crm-animate-in lg:space-y-5 ${editMode ? "pb-24 sm:pb-0" : ""}`}>
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
        <div className="min-w-0">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-[12.5px] text-wo-dim transition hover:text-wo-text"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
            {prospect.project?.name ? ` · ${prospect.project.name}` : ""}
          </Link>
          <h1 className="mt-2 font-display text-[1.45rem] font-semibold leading-tight tracking-tight text-wo-text lg:text-[2.1rem]">
            {prospect.club_name}
          </h1>
          {contextLine ? <p className="mt-1.5 text-[13.5px] text-wo-muted">{contextLine}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={prospect.status} />
            {prospect.status === "Fermé" && formatClosedReason(prospect.closed_reason, prospect.closed_note) ? (
              <span className="text-sm text-wo-muted">
                {formatClosedReason(prospect.closed_reason, prospect.closed_note)}
              </span>
            ) : null}
            {isArchived ? (
              <span className="crm-badge bg-wo-hover text-wo-muted">
                <span className="crm-badge-dot bg-zinc-400" />
                Archivé
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:items-center lg:justify-end">
          {!editMode ? <div className="col-span-2 lg:col-auto">{statusSelector}</div> : null}
          {editMode ? (
            <>
              <button type="button" className={`${ui.btnSecondary} w-full`} onClick={() => setEditMode(false)} disabled={pending}>
                Annuler
              </button>
              <button
                type="button"
                className={`${ui.btnPrimary} w-full`}
                disabled={pending || !draft.club_name.trim()}
                onClick={() => handleSaveDraft()}
              >
                Enregistrer
              </button>
            </>
          ) : (
            <>
              <button type="button" className={`${ui.btnSecondary} w-full`} onClick={enterEditMode}>
                <IconEdit className="h-4 w-4" stroke={1.75} />
                Modifier
              </button>
              <div className="relative lg:order-last" ref={moreRef}>
                <button
                  type="button"
                  className={`${ui.btnSecondary} w-full`}
                  onClick={() => setMoreOpen((v) => !v)}
                >
                  <IconDots className="h-4 w-4" />
                  Plus
                  <IconChevronDown className="h-3.5 w-3.5" />
                </button>
                {moreOpen ? (
                  <div className="wo-modal absolute right-0 z-30 mt-2 w-56 overflow-hidden p-1.5">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-wo-secondary hover:bg-white/[0.05]"
                      onClick={() => {
                        setMoreOpen(false);
                        setScheduleDemoOpen(true);
                      }}
                    >
                      <IconPresentation className="h-4 w-4" />
                      {isDemoScheduledStatus(prospect.status) ? "Modifier la démo" : "Planifier une démo"}
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-wo-secondary hover:bg-white/[0.05]"
                      onClick={() => {
                        setMoreOpen(false);
                        runAction("demo_done");
                      }}
                    >
                      <IconCircleCheck className="h-4 w-4" />
                      Démo effectuée
                    </button>
                    {prospect.status !== "Client" ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-wo-secondary hover:bg-white/[0.05]"
                        onClick={() => {
                          setMoreOpen(false);
                          runAction("client");
                        }}
                      >
                        <IconUserCheck className="h-4 w-4" />
                        Passer en client
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-rose-300 hover:bg-rose-500/10"
                      onClick={() => {
                        setMoreOpen(false);
                        runAction("refus");
                      }}
                    >
                      <IconUserX className="h-4 w-4" />
                      Perdu
                    </button>
                    <div className="my-1 border-t border-wo-border" />
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-wo-secondary hover:bg-white/[0.05]"
                      onClick={() => {
                        setMoreOpen(false);
                        if (isArchived) restoreProspect();
                        else archiveProspect();
                      }}
                    >
                      <IconArchive className="h-4 w-4" />
                      {isArchived ? "Restaurer" : "Archiver"}
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-rose-300 hover:bg-rose-500/10"
                      onClick={() => {
                        setMoreOpen(false);
                        setDeleteError(null);
                        setShowDeleteModal(true);
                      }}
                    >
                      <IconTrash className="h-4 w-4" />
                      Supprimer
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className={`${ui.btnSecondary} hidden w-full lg:inline-flex`}
                onClick={() => setAddContactKey((n) => n + 1)}
              >
                <IconUserPlus className="h-4 w-4" />
                Ajouter un contact
              </button>
              <button
                type="button"
                className={`${ui.btnPrimary} col-span-2 w-full lg:col-auto lg:w-auto`}
                disabled={busy || isArchived}
                onClick={() => setInteractionChannel("email")}
              >
                <IconMail className="h-4 w-4" />
                Contacter
              </button>
            </>
          )}
        </div>
      </header>

      {msg ? <p className={ui.alertInfo}>{msg}</p> : null}
      {errorMsg ? <p className={ui.alertError}>{errorMsg}</p> : null}

      <div className="grid items-start gap-3 lg:gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
        <div className="contents xl:flex xl:flex-col xl:gap-5">
          <div className="order-1">
          <ProspectFollowUpCard
            prospect={prospect}
            lastActivity={lastCommercialActivity(activities)}
            contactCount={contactCount}
            disabled={isArchived || busy}
            onFollowUpChange={(value) => {
              setProspect((p) => ({ ...p, next_follow_up: value }));
              saveInlineField("next_follow_up", value ?? "");
            }}
            onEditDemo={() => setScheduleDemoOpen(true)}
          />
          </div>

          <div className="order-3">
            <ProspectMeetingsPanel
              meetings={meetings}
              prospectId={prospect.id}
              projectId={prospect.project_id}
              onAdd={() => {
                if (!isArchived) setMeetingOpen(true);
              }}
            />
          </div>

          <section className={`${ui.card} order-4 p-4 lg:p-6`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className={ui.h2}>Informations générales</h2>
                <p className="mt-0.5 text-[12.5px] text-wo-muted">Les données utiles, sans le bruit.</p>
              </div>
              {!editMode ? (
                <button type="button" className={ui.btnGhost} onClick={enterEditMode}>
                  <IconEdit className="h-4 w-4" />
                  Modifier
                </button>
              ) : null}
            </div>

            {!editMode ? (
              primaryInfo.length === 0 && secondaryInfo.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center">
                  <p className="text-sm text-wo-muted">Peu d’informations renseignées pour l’instant.</p>
                  <button type="button" className={`${ui.btnSecondary} mt-4`} onClick={enterEditMode}>
                    Compléter la fiche
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                    {primaryInfo.map((item) => (
                      <InfoField key={item.label} label={item.label}>
                        {item.node}
                      </InfoField>
                    ))}
                    {showMoreInfo
                      ? secondaryInfo.map((item) => (
                          <InfoField key={item.label} label={item.label}>
                            {item.node}
                          </InfoField>
                        ))
                      : null}
                  </div>
                  {secondaryInfo.length > 0 ? (
                    <button
                      type="button"
                      className={`${ui.btnGhost} mt-3 px-0`}
                      onClick={() => setShowMoreInfo((v) => !v)}
                    >
                      {showMoreInfo ? "Réduire" : "Voir plus"}
                    </button>
                  ) : null}
                </>
              )
            ) : (
              <div className="mt-4 space-y-4">
                <ProspectBusinessFields
                  mode="edit"
                  showLogo
                  values={draft}
                  onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
                />
                <div>
                  <label className={ui.label}>Statut</label>
                  <StatusSelect
                    value={draft.status}
                    onChange={(status) => setDraft((d) => ({ ...d, status }))}
                  />
                </div>
              </div>
            )}
          </section>

          <div className="order-8">
          <ProspectTimeline
            activities={activities}
            canUndo={!editMode && canUndo}
            pending={busy}
            onUndoLast={undoLastAction}
            onDelete={(a) => {
              setConfirm({
                tone: "danger",
                title: "Supprimer cette action de l’historique ?",
                description: "Cela supprimera l’entrée correspondante.",
                confirmLabel: "Supprimer",
                cancelLabel: "Annuler",
                onConfirm: () => {
                  setConfirm(null);
                  startTransition(async () => {
                    const res = await fetch(`/api/prospects/${prospect.id}/activities/${a.id}`, { method: "DELETE" });
                    const data = await res.json();
                    if (!res.ok) {
                      setMsg(data.error ?? "Erreur.");
                      return;
                    }
                    if (data.prospect) setProspect(data.prospect as Prospect);
                    if (data.activities) setActivities(data.activities as ProspectActivity[]);
                    setMsg("Action supprimée.");
                    await refreshAll();
                  });
                },
              });
            }}
          />
          </div>
        </div>

        <div className="contents xl:flex xl:flex-col xl:gap-5">
          <section className={`${ui.card} order-2 p-4 lg:p-5`}>
            <h2 className={ui.h2}>Actions rapides</h2>
            {isArchived ? (
              <p className="mt-3 text-sm text-wo-muted">
                Ce prospect est archivé. Restaurez-le pour enregistrer de nouvelles actions.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" disabled={busy} className="wo-action-tile wo-action-tile-primary" onClick={() => setMeetingOpen(true)}>
                  <IconUsers className="h-[18px] w-[18px]" stroke={1.7} />
                  Rencontre
                </button>
                <button type="button" disabled={busy} className="wo-action-tile" onClick={() => setInteractionChannel("email")}>
                  <IconMail className="h-[18px] w-[18px]" stroke={1.7} />
                  Email
                </button>
                <button type="button" disabled={busy} className="wo-action-tile" onClick={() => setInteractionChannel("call")}>
                  <IconPhone className="h-[18px] w-[18px]" stroke={1.7} />
                  Appel
                </button>
                <button type="button" disabled={busy} className="wo-action-tile" onClick={() => setInteractionChannel("message")}>
                  <IconMessage className="h-[18px] w-[18px]" stroke={1.7} />
                  Message
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="wo-action-tile"
                  onClick={() => document.getElementById("prospect-followup-date")?.focus()}
                >
                  <IconCalendarEvent className="h-[18px] w-[18px]" stroke={1.7} />
                  Relance
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="wo-action-tile"
                  onClick={() => setTaskCreateKey((n) => n + 1)}
                >
                  <IconChecklist className="h-[18px] w-[18px]" stroke={1.7} />
                  Tâche
                </button>
              </div>
            )}
          </section>

          <div className="order-5">
          <ProspectContactsPanel
            prospectId={prospect.id}
            openAddKey={addContactKey}
            onCountChange={setContactCount}
            onChanged={() => void refreshAll()}
          />
          </div>

          <section className={`${ui.card} order-6 p-4 lg:p-5`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={ui.h2}>Notes</h2>
              {!editMode && hasNotes && !notesEditing ? (
                <button type="button" className={ui.btnGhost} onClick={() => setNotesEditing(true)}>
                  Modifier
                </button>
              ) : null}
            </div>
            {editMode || notesEditing || (!hasNotes && notesEditing) ? (
              <>
                <textarea
                  className={`${ui.input} mt-4 min-h-[140px] resize-y`}
                  value={notesValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (editMode) setDraft((d) => ({ ...d, notes: v }));
                    else setNotes(v);
                  }}
                  placeholder="Notes libres sur ce prospect…"
                />
                {!editMode ? (
                  <div className="mt-3 flex justify-end gap-2">
                    <button type="button" className={ui.btnGhost} onClick={() => setNotesEditing(false)}>
                      Annuler
                    </button>
                    <button
                      type="button"
                      className={ui.btnPrimary}
                      disabled={pending}
                      onClick={() => {
                        saveNotes();
                        setNotesEditing(false);
                      }}
                    >
                      Enregistrer
                    </button>
                  </div>
                ) : null}
              </>
            ) : hasNotes ? (
              <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-white/[0.03] px-4 py-3.5 text-[13.5px] leading-relaxed text-wo-secondary">
                {notesValue}
              </p>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center">
                <p className="text-sm text-wo-muted">Aucune note pour le moment.</p>
                <button type="button" className={`${ui.btnSecondary} mt-4`} onClick={() => setNotesEditing(true)}>
                  <IconPlus className="h-4 w-4" />
                  Ajouter une note
                </button>
              </div>
            )}
          </section>

          <div className="order-7">
          <ProspectLinkedTasks
            prospectId={prospect.id}
            projectId={prospect.project_id}
            openCreateKey={taskCreateKey}
          />
          </div>
        </div>
      </div>


      <section className="rounded-[20px] border border-rose-400/18 bg-rose-500/[0.06] p-5">
        <h2 className="text-sm font-semibold tracking-tight text-rose-200">Zone dangereuse</h2>
        <p className="mt-1 text-sm text-rose-200/60">
          {isArchived
            ? "Ce prospect est archivé. Vous pouvez le restaurer ou le supprimer définitivement."
            : hasHistoryOrNotes
              ? "Ce prospect a déjà un historique ou des notes. Préférez l’archivage si vous voulez conserver ces informations."
              : "Archiver retire le prospect de la liste. Supprimer efface toutes les données liées."}
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {isArchived ? (
            <button
              type="button"
              className={`${ui.btnSecondary} w-full sm:w-auto`}
              disabled={pending || archiveLoading || deleteLoading}
              onClick={restoreProspect}
            >
              <IconArchive className="h-4 w-4" stroke={1.75} />
              {archiveLoading ? "Restauration…" : "Restaurer le prospect"}
            </button>
          ) : (
            <button
              type="button"
              className={`${ui.btnSecondary} w-full sm:w-auto`}
              disabled={pending || archiveLoading || deleteLoading}
              onClick={archiveProspect}
            >
              <IconArchive className="h-4 w-4" stroke={1.75} />
              {archiveLoading ? "Archivage…" : "Archiver le prospect"}
            </button>
          )}
          <button
            type="button"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50 sm:w-auto"
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

      <ScheduleDemoModal
        open={scheduleDemoOpen}
        prospect={prospect}
        lastDemoActivity={activities.find((a) => a.action_type === "demo_scheduled") ?? null}
        saving={scheduleDemoSaving}
        onClose={() => {
          if (!scheduleDemoSaving) setScheduleDemoOpen(false);
        }}
        onSave={(payload) => {
          void saveScheduleDemo(payload);
        }}
        onCancelDemo={isDemoScheduledStatus(prospect.status) ? () => void cancelScheduledDemo() : undefined}
      />

      <MeetingComposer
        open={meetingOpen}
        prospectId={prospect.id}
        clubName={prospect.club_name}
        onClose={() => {
          setMeetingOpen(false);
          void refreshAll();
        }}
        onSaved={(meeting, nextActivities, nextProspect) => {
          setMeetings((list) => [meeting, ...list.filter((item) => item.id !== meeting.id)]);
          if (Array.isArray(nextActivities)) setActivities(nextActivities as ProspectActivity[]);
          if (nextProspect) setProspect(nextProspect as Prospect);
          setMsg("Compte-rendu enregistré.");
        }}
      />

      <InteractionModal
        open={Boolean(interactionChannel)}
        channel={interactionChannel}
        defaultKind={defaultInteractionKindForStage(prospect.status)}
        saving={interactionSaving}
        onClose={() => {
          if (!interactionSaving) setInteractionChannel(null);
        }}
        onSave={(payload) => {
          void saveInteraction(payload);
        }}
      />

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

      {editMode ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-wo-border bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-lg gap-2">
            <button
              type="button"
              className={`${ui.btnSecondary} flex-1`}
              onClick={() => setEditMode(false)}
              disabled={pending}
            >
              Annuler
            </button>
            <button
              type="button"
              className={`${ui.btnPrimary} flex-1`}
              disabled={pending || !draft.club_name.trim()}
              onClick={() => handleSaveDraft()}
            >
              Enregistrer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

