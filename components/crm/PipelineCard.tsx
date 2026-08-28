"use client";

import {
  formatContactLine,
  formatLastContact,
  formatLocationLine,
  getNextActionDisplay,
} from "@/lib/crm/follow-up-display";
import { formatClosedReason } from "@/lib/crm/closed";
import { formatRelayFollowUp } from "@/lib/crm/format";
import { prospectAvatarTone } from "@/lib/crm/pipeline";
import type { Prospect } from "@/lib/crm/types";

const TEMPORAL_STYLES = {
  future: "text-wo-muted",
  today: "font-medium text-amber-700",
  overdue: "font-medium text-rose-600",
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

  if (columnId === "relay") {
    const contact = formatContactLine(prospect);
    const location = formatLocationLine(prospect);
    const relay = formatRelayFollowUp(prospect.next_follow_up);
    return (
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-wo-text">{prospect.club_name}</p>
        {contact ? <p className="mt-1 truncate text-[11px] text-wo-dim">{contact}</p> : null}
        {location ? <p className="mt-0.5 truncate text-[11px] text-wo-dim">{location}</p> : null}
        <p className="mt-1.5 text-[11px] text-wo-secondary">{relay}</p>
      </div>
    );
  }

  const contact = formatContactLine(prospect);
  const location = formatLocationLine(prospect);
  const lastContact = formatLastContact(prospect);
  const { temporal, datedLabel } = getNextActionDisplay(prospect);

  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-[13px] font-medium leading-snug text-wo-text">{prospect.club_name}</p>
      {contact ? <p className="mt-1 truncate text-[11px] text-wo-dim">{contact}</p> : null}
      {location ? <p className="mt-0.5 truncate text-[11px] text-wo-dim">{location}</p> : null}
      {lastContact ? (
        <p className="mt-1.5 truncate text-[11px] text-wo-muted">{lastContact}</p>
      ) : null}
      {datedLabel || temporal.kind !== "none" ? (
        <div className="mt-1 space-y-0.5">
          {datedLabel && temporal.kind === "future" ? (
            <p className="truncate text-[11px] text-wo-secondary">{datedLabel}</p>
          ) : null}
          {temporal.kind !== "none" && temporal.kind !== "future" ? (
            <p className={`truncate text-[11px] ${TEMPORAL_STYLES[temporal.kind]}`}>{temporal.primary}</p>
          ) : null}
          {temporal.kind === "future" && temporal.primary ? (
            <p className={`truncate text-[11px] ${TEMPORAL_STYLES.future}`}>{temporal.primary}</p>
          ) : null}
          {datedLabel && temporal.kind === "today" ? (
            <p className="truncate text-[11px] text-wo-muted">{datedLabel}</p>
          ) : null}
          {datedLabel && temporal.kind === "overdue" ? (
            <p className="truncate text-[11px] text-wo-muted">{datedLabel}</p>
          ) : null}
        </div>
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
