import { formatClosedReason } from "./closed";
import { INTERACTION_TYPES, type ProspectActivity } from "./types";
import { parseStatusChangePayload } from "./status";

export type TimelineActivityView = {
  showChannel: boolean;
  title: string | null;
  body: string | null;
};

function looksLikeJson(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.startsWith("{") && trimmed.endsWith("}");
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function jsonNote(description: string | null): string | null {
  if (!description || !looksLikeJson(description)) return null;
  const obj = parseJsonObject(description.trim());
  if (!obj) return null;
  const note = obj.note;
  return typeof note === "string" && note.trim() ? note.trim() : null;
}

function humanBody(activity: ProspectActivity): string | null {
  const description = activity.description;
  if (!description) return null;
  if (!looksLikeJson(description)) return description;

  if (activity.action_type === "status_change") {
    const parsed = parseStatusChangePayload(description);
    return formatClosedReason(parsed.closed_reason, parsed.closed_note);
  }

  if (activity.action_type === "refus") {
    const obj = parseJsonObject(description.trim());
    const reason = formatClosedReason(
      typeof obj?.closed_reason === "string" ? obj.closed_reason : null,
      typeof obj?.closed_note === "string" ? obj.closed_note : null
    );
    return jsonNote(description) || reason;
  }

  return jsonNote(description);
}

function statusChangeTitle(activity: ProspectActivity): string {
  const parsed = parseStatusChangePayload(activity.description);
  const fromTitle = activity.title.match(/^Statut modifié de (.+) à (.+)$/i);
  const from = parsed.from || fromTitle?.[1] || null;
  const to = parsed.to || fromTitle?.[2] || null;
  if (from && to) return `Statut modifié : ${from} → ${to}`;
  if (to) return `Statut modifié : ${to}`;
  if (activity.title && !looksLikeJson(activity.title)) return activity.title;
  return "Statut modifié";
}

/** Transforme une activité en texte affichable — jamais de JSON technique. */
export function formatTimelineActivity(activity: ProspectActivity): TimelineActivityView {
  const body = humanBody(activity);
  const isManual = (INTERACTION_TYPES as readonly string[]).includes(activity.action_type);

  if (activity.action_type === "status_change") {
    return { showChannel: false, title: statusChangeTitle(activity), body };
  }

  if (isManual) {
    const channel = activity.channel?.trim() || null;
    const typeLabel =
      activity.action_type === "email"
        ? "Email"
        : activity.action_type === "whatsapp"
          ? "WhatsApp"
          : activity.action_type === "call"
            ? "Téléphone"
            : activity.action_type === "linkedin"
              ? "LinkedIn"
              : activity.action_type === "meeting"
                ? "Rencontre"
                : null;
    const redundantTitle =
      !activity.title ||
      activity.title === channel ||
      activity.title === typeLabel ||
      (channel && activity.title.startsWith(`${channel} —`)) ||
      (typeLabel && activity.title.startsWith(`${typeLabel} —`));

    let title: string | null = redundantTitle ? null : activity.title;
    if (!title && !body && !channel) {
      title = typeLabel || activity.title || "Interaction";
    }

    return {
      showChannel: Boolean(channel),
      title,
      body,
    };
  }

  const title = activity.title && !looksLikeJson(activity.title) ? activity.title : null;
  return { showChannel: false, title, body };
}
