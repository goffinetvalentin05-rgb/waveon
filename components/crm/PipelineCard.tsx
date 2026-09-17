"use client";

import { formatLastContact, formatLastInteractionSummary, formatSectorLocationLine, formatContactLine, getNextActionDisplay } from "@/lib/crm/follow-up-display";
import { formatClosedReason } from "@/lib/crm/closed";
import { formatRelayFollowUp } from "@/lib/crm/format";
import { prospectAvatarTone } from "@/lib/crm/pipeline";
import type { Prospect } from "@/lib/crm/types";

const TEMPORAL_STYLES = {
  future: "text-wo-muted",
  today: "font-medium text-amber-300",
  overdue: "font-medium text-rose-300",
  none: "text-wo-dim",
} as const;

export function PipelineCard({ prospect, columnId }: { prospect: Prospect; columnId: string }) {
  if (columnId === "closed") {
    const reason = formatClosedReason(prospect.closed_reason, prospect.closed_note);
    return (
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-wo-text">{prospect.club_name}</p>
        {reason ? <p className="mt-1 truncate text-[11px] text-wo-dim">{reason}</p> : null}
      </div>
    );
  }

  const sectorLocation = formatSectorLocationLine(prospect);
  const lastInteraction = formatLastInteractionSummary(prospect);
  const lastContact = formatLastContact(prospect);
  const { followUp } = getNextActionDisplay(prospect);

  if (columnId === "relay") {
    return (
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-wo-text">{prospect.club_name}</p>
        {sectorLocation ? <p className="mt-1 truncate text-[11px] text-wo-dim">{sectorLocation}</p> : null}
        {lastContact ? <p className="mt-1.5 truncate text-[11px] text-wo-muted">{lastContact}</p> : null}
        <p className="mt-1 truncate text-[11px] text-wo-secondary">{formatRelayFollowUp(prospect.next_follow_up)}</p>
      </div>
    );
  }

  const showRichLastInteraction = columnId === "awaiting_decision" || columnId === "demo" || columnId === "discussion";

  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-[13px] font-medium leading-snug text-wo-text">{prospect.club_name}</p>
      {formatContactLine(prospect) ? (
        <p className="mt-0.5 truncate text-[11px] text-wo-muted">{formatContactLine(prospect)}</p>
      ) : null}
      {sectorLocation ? <p className="mt-1 truncate text-[11px] text-wo-dim">{sectorLocation}</p> : null}
      {showRichLastInteraction && lastInteraction ? (
        <p className="mt-1.5 truncate text-[11px] text-wo-muted">Dernière interaction : {lastInteraction}</p>
      ) : lastContact ? (
        <p className="mt-1.5 truncate text-[11px] text-wo-muted">{lastContact}</p>
      ) : null}
      {followUp.kind === "today" || followUp.kind === "overdue" ? (
        <p className={`mt-1 truncate text-[11px] ${TEMPORAL_STYLES[followUp.kind]}`}>{followUp.alert}</p>
      ) : followUp.kind === "future" && followUp.dateLabel ? (
        <p className="mt-1 truncate text-[11px] text-wo-secondary">Prochaine relance : {followUp.dateLabel}</p>
      ) : null}
    </div>
  );
}

export function PipelineCardAvatar({ name }: { name: string }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${prospectAvatarTone(name)}`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
