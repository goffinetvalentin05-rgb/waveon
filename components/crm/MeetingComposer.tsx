"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconCamera,
  IconPhoto,
  IconSparkles,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { ScrollableModal } from "@/components/ui/ScrollableModal";
import { ui } from "@/lib/design/tokens";
import {
  MEETING_TYPE_LABELS,
  MEETING_TYPES,
  emptyMeetingReport,
  linesToList,
  listToLines,
  type MeetingNextAction,
  type MeetingParticipant,
  type MeetingParticipantOption,
  type MeetingReport,
  type MeetingType,
  type ProspectMeeting,
} from "@/lib/crm/meetings";

type Step = "form" | "draft" | "actions";

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82)
    );
    bitmap.close();
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function toDateTimeLocal(value = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function ReportListField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={ui.label}>{label}</label>
      <textarea
        className={`${ui.input} mt-1 min-h-[88px] resize-y`}
        value={listToLines(value)}
        onChange={(e) => onChange(linesToList(e.target.value))}
        placeholder={placeholder ?? "Une ligne par élément. Laissez vide si absent des notes."}
      />
    </div>
  );
}

export function MeetingComposer({
  open,
  prospectId,
  clubName,
  onClose,
  onSaved,
}: {
  open: boolean;
  prospectId: string;
  clubName: string;
  onClose: () => void;
  onSaved: (meeting: ProspectMeeting, activities?: unknown[], prospect?: unknown) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("form");
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState<MeetingType>("rencontre");
  const [occurredAt, setOccurredAt] = useState(toDateTimeLocal());
  const [notes, setNotes] = useState("");
  const [extraPeople, setExtraPeople] = useState("");
  const [options, setOptions] = useState<MeetingParticipantOption[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [report, setReport] = useState<MeetingReport>(emptyMeetingReport());
  const [extractedText, setExtractedText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<ProspectMeeting | null>(null);
  const [pickedActions, setPickedActions] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!open) return;
    setStep("form");
    setTitle(`Rencontre — ${clubName}`);
    setMeetingType("rencontre");
    setOccurredAt(toDateTimeLocal());
    setNotes("");
    setExtraPeople("");
    setPhotos([]);
    setReport(emptyMeetingReport());
    setExtractedText("");
    setError(null);
    setSaved(null);
    setPickedActions({});
    void Promise.all([
      fetch(`/api/prospects/${prospectId}/meetings`).then((r) => r.json()),
      fetch(`/api/prospects/${prospectId}/contacts`).then((r) => r.json()),
    ])
      .then(([meetingData, contactData]) => {
        if (Array.isArray(meetingData.participantOptions) && meetingData.participantOptions.length) {
          const list = meetingData.participantOptions as MeetingParticipantOption[];
          setOptions(list);
          const initial: Record<string, boolean> = {};
          list.forEach((opt, index) => {
            if (opt.kind === "contact" && index === 0) initial[`${opt.kind}:${opt.id}`] = true;
          });
          setSelected(initial);
          return;
        }
        const contacts = (contactData.contacts ?? []) as { id: string; first_name: string; last_name?: string | null }[];
        const list: MeetingParticipantOption[] = contacts.map((c) => ({
          kind: "contact",
          id: c.id,
          name: [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || "Sans nom",
        }));
        setOptions(list);
        const initial: Record<string, boolean> = {};
        if (list[0]) initial[`contact:${list[0].id}`] = true;
        setSelected(initial);
      })
      .catch(() => null);
  }, [open, prospectId, clubName]);

  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  const participants = useMemo((): MeetingParticipant[] => {
    const picked = options
      .filter((opt) => selected[`${opt.kind}:${opt.id}`])
      .map((opt) => ({ kind: opt.kind, id: opt.id, name: opt.name }));
    const extras = extraPeople
      .split(/[,;\n]+/)
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ kind: "free" as const, name }));
    return [...picked, ...extras];
  }, [options, selected, extraPeople]);

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const next = await Promise.all(Array.from(list).slice(0, 8).map(compressImage));
    setPhotos((current) => [...current, ...next].slice(0, 8));
  };

  const analyze = async () => {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("title", title);
      form.set("meeting_type", meetingType);
      form.set("notes", notes);
      photos.forEach((file) => form.append("photos", file));
      const res = await fetch(`/api/prospects/${prospectId}/meetings/analyze`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analyse impossible.");
        return;
      }
      setExtractedText(data.extracted_text ?? "");
      setReport(data.report ?? emptyMeetingReport());
      setStep("draft");
    } finally {
      setBusy(false);
    }
  };

  const skipToDraft = () => {
    setReport((current) => ({
      ...emptyMeetingReport(),
      ...current,
      summary: current.summary || notes,
    }));
    setStep("draft");
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("title", title.trim());
      form.set("meeting_type", meetingType);
      form.set("occurred_at", new Date(occurredAt).toISOString());
      form.set("participants", JSON.stringify(participants));
      form.set("notes_free", notes);
      form.set("extracted_text", extractedText);
      form.set("report", JSON.stringify(report));
      photos.forEach((file) => form.append("photos", file));
      const res = await fetch(`/api/prospects/${prospectId}/meetings`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Enregistrement impossible.");
        return;
      }
      const meeting = data.meeting as ProspectMeeting;
      setSaved(meeting);
      onSaved(meeting, data.activities, data.prospect);
      const actions = meeting.report.next_actions ?? [];
      if (actions.length === 0) {
        onClose();
        return;
      }
      const picked: Record<number, boolean> = {};
      actions.forEach((_, i) => {
        picked[i] = !actions[i].uncertain;
      });
      setPickedActions(picked);
      setStep("actions");
    } finally {
      setBusy(false);
    }
  };

  const createFollowUps = async () => {
    if (!saved) return;
    setBusy(true);
    setError(null);
    try {
      const items = (saved.report.next_actions ?? [])
        .map((action, index) =>
          pickedActions[index]
            ? {
                kind: action.kind || "task",
                title: action.text,
                due: action.due,
              }
            : null
        )
        .filter(Boolean);
      const res = await fetch(`/api/prospects/${prospectId}/meetings/${saved.id}/follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible de créer les actions.");
        return;
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const footer =
    step === "form" ? (
      <div className="flex flex-col gap-2">
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <button
          type="button"
          className={`${ui.btnPrimary} w-full`}
          disabled={busy || (photos.length === 0 && !notes.trim())}
          onClick={() => void analyze()}
        >
          <IconSparkles className="h-4 w-4" />
          {busy ? "Analyse…" : "Analyser les notes"}
        </button>
        <button type="button" className={`${ui.btnSecondary} w-full`} disabled={busy} onClick={skipToDraft}>
          Rédiger sans IA
        </button>
      </div>
    ) : step === "draft" ? (
      <div className="flex flex-col gap-2">
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <p className="text-[12px] text-amber-200/90">Brouillon — relisez avant d’enregistrer. Rien n’est encore dans l’historique.</p>
        <button type="button" className={`${ui.btnPrimary} w-full`} disabled={busy || !title.trim()} onClick={() => void save()}>
          {busy ? "Enregistrement…" : "Enregistrer le compte-rendu"}
        </button>
        <button type="button" className={`${ui.btnSecondary} w-full`} disabled={busy} onClick={() => setStep("form")}>
          Retour
        </button>
      </div>
    ) : (
      <div className="flex flex-col gap-2">
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <button type="button" className={`${ui.btnPrimary} w-full`} disabled={busy || !Object.values(pickedActions).some(Boolean)} onClick={() => void createFollowUps()}>
          {busy ? "Création…" : "Créer les actions sélectionnées"}
        </button>
        <button type="button" className={`${ui.btnGhost} w-full`} disabled={busy} onClick={onClose}>
          Plus tard
        </button>
      </div>
    );

  return (
    <ScrollableModal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={step === "actions" ? "Créer les actions de suivi" : step === "draft" ? "Brouillon du compte-rendu" : "Nouvelle rencontre"}
      subtitle={
        step === "form"
          ? "Photographiez vos notes, puis laissez Raven structurer un brouillon."
          : step === "draft"
            ? "Corrigez tout ce qui est inexact. Les champs vides restent vides."
            : "Rien n’est créé tant que vous ne confirmez pas."
      }
      maxWidthClass="w-full sm:max-w-lg"
      footer={footer}
    >
      {step === "form" ? (
        <div className="space-y-4">
          <div>
            <label className={ui.label}>Titre</label>
            <input className={`${ui.input} mt-1 min-h-11`} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={ui.label}>Date et heure</label>
              <input
                type="datetime-local"
                className={`${ui.input} mt-1 min-h-11`}
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </div>
            <div>
              <label className={ui.label}>Type</label>
              <select
                className={`${ui.input} mt-1 min-h-11`}
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value as MeetingType)}
              >
                {MEETING_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {MEETING_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className={`${ui.label} mb-2 flex items-center gap-1.5`}>
              <IconUsers className="h-3.5 w-3.5" />
              Participants
            </p>
            <div className="space-y-1.5">
              {options.length === 0 ? (
                <p className="text-[12.5px] text-wo-dim">Aucun contact enregistré. Ajoutez un nom libre.</p>
              ) : (
                options.map((opt) => {
                  const key = `${opt.kind}:${opt.id}`;
                  return (
                    <label key={key} className="flex min-h-11 items-center gap-3 rounded-xl border border-wo-border px-3 py-2.5 text-[13.5px]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#d97732]"
                        checked={Boolean(selected[key])}
                        onChange={() => setSelected((s) => ({ ...s, [key]: !s[key] }))}
                      />
                      <span className="min-w-0 flex-1 truncate text-wo-text">{opt.name}</span>
                      <span className="text-[11px] text-wo-dim">{opt.kind === "contact" ? "Prospect" : "Équipe"}</span>
                    </label>
                  );
                })
              )}
            </div>
            <input
              className={`${ui.input} mt-2 min-h-11`}
              value={extraPeople}
              onChange={(e) => setExtraPeople(e.target.value)}
              placeholder="Autres participants (séparés par une virgule)"
            />
          </div>

          <div>
            <label className={ui.label}>Notes libres</label>
            <textarea
              className={`${ui.input} mt-1 min-h-[96px] resize-y`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ce que vous voulez absolument retenir…"
            />
          </div>

          <div className="rounded-2xl border border-dashed border-wo-accent/25 bg-wo-accent-soft/40 p-4">
            <p className="text-[13px] font-semibold text-wo-text">Ajouter des notes depuis une photo</p>
            <p className="mt-1 text-[12px] text-wo-muted">Sortez de réunion, photographiez le carnet, analysez.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className={`${ui.btnPrimary} w-full`} onClick={() => cameraRef.current?.click()}>
                <IconCamera className="h-4 w-4" />
                Photo
              </button>
              <button type="button" className={`${ui.btnSecondary} w-full`} onClick={() => libraryRef.current?.click()}>
                <IconPhoto className="h-4 w-4" />
                Importer
              </button>
            </div>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={libraryRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {previews.length > 0 ? (
              <ul className="mt-3 grid grid-cols-3 gap-2">
                {previews.map((src, index) => (
                  <li key={src} className="relative overflow-hidden rounded-xl border border-wo-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-24 w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                      onClick={() => setPhotos((list) => list.filter((_, i) => i !== index))}
                      aria-label="Retirer"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === "draft" ? (
        <div className="space-y-4">
          {extractedText ? (
            <details className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
              <summary className="cursor-pointer text-[12.5px] font-medium text-wo-muted">Texte lu sur les photos</summary>
              <p className="mt-2 whitespace-pre-wrap text-[13px] text-wo-secondary">{extractedText}</p>
            </details>
          ) : null}
          {report.uncertain.length > 0 ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-3 text-[12.5px] text-amber-100">
              À vérifier : {report.uncertain.join(" · ")}
            </div>
          ) : null}
          <div>
            <label className={ui.label}>Résumé</label>
            <textarea
              className={`${ui.input} mt-1 min-h-[96px] resize-y`}
              value={report.summary}
              onChange={(e) => setReport((r) => ({ ...r, summary: e.target.value }))}
            />
          </div>
          <ReportListField label="Points discutés" value={report.discussed} onChange={(discussed) => setReport((r) => ({ ...r, discussed }))} />
          <ReportListField label="Besoins du prospect" value={report.needs} onChange={(needs) => setReport((r) => ({ ...r, needs }))} />
          <ReportListField label="Retours / feedback" value={report.feedback} onChange={(feedback) => setReport((r) => ({ ...r, feedback }))} />
          <ReportListField label="Objections / questions" value={report.objections} onChange={(objections) => setReport((r) => ({ ...r, objections }))} />
          <ReportListField label="Décisions prises" value={report.decisions} onChange={(decisions) => setReport((r) => ({ ...r, decisions }))} />
          <ReportListField label="Informations importantes" value={report.important} onChange={(important) => setReport((r) => ({ ...r, important }))} />
          <div>
            <label className={ui.label}>Prochaines actions</label>
            <div className="mt-2 space-y-2">
              {report.next_actions.map((action, index) => (
                <div key={`${action.text}-${index}`} className="rounded-2xl border border-wo-border bg-white/[0.03] p-3">
                  <input
                    className={`${ui.input} min-h-11`}
                    value={action.text}
                    onChange={(e) =>
                      setReport((r) => ({
                        ...r,
                        next_actions: r.next_actions.map((item, i) => (i === index ? { ...item, text: e.target.value } : item)),
                      }))
                    }
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      className={ui.input}
                      placeholder="Responsable"
                      value={action.owner ?? ""}
                      onChange={(e) =>
                        setReport((r) => ({
                          ...r,
                          next_actions: r.next_actions.map((item, i) =>
                            i === index ? { ...item, owner: e.target.value } : item
                          ),
                        }))
                      }
                    />
                    <input
                      type="date"
                      className={ui.input}
                      value={action.due ?? ""}
                      onChange={(e) =>
                        setReport((r) => ({
                          ...r,
                          next_actions: r.next_actions.map((item, i) =>
                            i === index ? { ...item, due: e.target.value || null } : item
                          ),
                        }))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-[12px] text-rose-300"
                    onClick={() =>
                      setReport((r) => ({
                        ...r,
                        next_actions: r.next_actions.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    Supprimer
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={ui.btnGhost}
                onClick={() =>
                  setReport((r) => ({
                    ...r,
                    next_actions: [...r.next_actions, { text: "", kind: "task" } satisfies MeetingNextAction],
                  }))
                }
              >
                Ajouter une action
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === "actions" ? (
        <div className="space-y-2">
          {(saved?.report.next_actions ?? []).map((action, index) => (
            <label key={`${action.text}-${index}`} className="flex items-start gap-3 rounded-2xl border border-wo-border px-3 py-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[#d97732]"
                checked={Boolean(pickedActions[index])}
                onChange={() => setPickedActions((s) => ({ ...s, [index]: !s[index] }))}
              />
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium text-wo-text">{action.text}</span>
                <span className="mt-0.5 block text-[11.5px] text-wo-dim">
                  {action.kind === "follow_up"
                    ? "Relance"
                    : action.kind === "meeting"
                      ? "Rendez-vous"
                      : "Tâche"}
                  {action.due ? ` · ${action.due}` : ""}
                  {action.owner ? ` · ${action.owner}` : ""}
                </span>
              </span>
            </label>
          ))}
        </div>
      ) : null}
    </ScrollableModal>
  );
}
