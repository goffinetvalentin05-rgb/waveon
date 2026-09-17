"use client";

import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { IconArrowRight, IconPlus, IconUsers } from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import {
  MEETING_TYPE_LABELS,
  meetingDetailHref,
  participantNames,
  type ProspectMeeting,
} from "@/lib/crm/meetings";

export function ProspectMeetingsPanel({
  meetings,
  prospectId,
  projectId,
  onAdd,
}: {
  meetings: ProspectMeeting[];
  prospectId: string;
  projectId?: string | null;
  onAdd: () => void;
}) {
  return (
    <section className={`${ui.card} p-4 lg:p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className={ui.h2}>Rencontres</h2>
          <p className="mt-0.5 text-[12.5px] text-wo-muted">Comptes-rendus et démos.</p>
        </div>
        <button type="button" className={ui.btnSecondary} onClick={onAdd}>
          <IconPlus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {meetings.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center">
          <p className="text-sm text-wo-muted">Aucune rencontre enregistrée.</p>
          <button type="button" className={`${ui.btnPrimary} mt-4`} onClick={onAdd}>
            Photographier des notes
          </button>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {meetings.map((meeting) => (
            <li key={meeting.id}>
              <Link
                href={meetingDetailHref(prospectId, meeting.id, projectId)}
                className="wo-row !items-start !py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-wo-dim">
                    {format(new Date(meeting.occurred_at), "d MMMM yyyy", { locale: fr })}
                    {" · "}
                    {MEETING_TYPE_LABELS[meeting.meeting_type]}
                  </span>
                  <span className="mt-1 block truncate text-[14px] font-semibold text-wo-text">
                    {meeting.title}
                  </span>
                  {meeting.participants.length > 0 ? (
                    <span className="mt-1 flex items-center gap-1 text-[12px] text-wo-muted">
                      <IconUsers className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{participantNames(meeting.participants)}</span>
                    </span>
                  ) : null}
                  {meeting.report.summary ? (
                    <span className="mt-1.5 block line-clamp-2 text-[12.5px] leading-relaxed text-wo-secondary">
                      {meeting.report.summary}
                    </span>
                  ) : null}
                  {meeting.actions_created_count > 0 ? (
                    <span className="mt-2 inline-flex rounded-full bg-wo-accent-soft px-2 py-0.5 text-[11px] font-medium text-[#f3a35c]">
                      {meeting.actions_created_count} action{meeting.actions_created_count > 1 ? "s" : ""} créée
                      {meeting.actions_created_count > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-wo-accent">
                  Voir
                  <IconArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
