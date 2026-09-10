import { isClosedProspectStatus } from "@/lib/crm/closed";
import { dateOnly } from "@/lib/crm/date-only";
import { migrateProspectStatus } from "@/lib/crm/status";
import type { ProspectStatus } from "@/lib/crm/types";

export const INTERACTION_CHANNELS = ["email", "message", "call"] as const;
export type InteractionChannel = (typeof INTERACTION_CHANNELS)[number];

export const INTERACTION_KINDS = [
  "first_contact",
  "follow_up_1",
  "follow_up_2",
  "follow_up_3",
  "other",
] as const;
export type InteractionKind = (typeof INTERACTION_KINDS)[number];

export const INTERACTION_CHANNEL_LABELS: Record<InteractionChannel, string> = {
  email: "Email",
  message: "Message",
  call: "Appel",
};

export const INTERACTION_KIND_LABELS: Record<InteractionKind, string> = {
  first_contact: "Premier contact",
  follow_up_1: "Relance 1",
  follow_up_2: "Relance 2",
  follow_up_3: "Relance 3",
  other: "Autre",
};

/** Types d'activité visibles dans la timeline commerciale. */
export const COMMERCIAL_ACTIVITY_TYPES = [
  "email",
  "message",
  "call",
  "mail_sent",
  "call_made",
  "whatsapp",
  "linkedin",
  "meeting",
  "demo",
  "demo_scheduled",
  "first_contact",
  "follow_up",
  "reply",
  "offer",
  "note",
  "client",
  "refus",
] as const;

/** Événements internes — conservés en base, masqués de la timeline principale. */
export const INTERNAL_ACTIVITY_TYPES = [
  "status_change",
  "created",
  "imported",
  "archived",
  "restored",
] as const;

const PROSPECTION_STAGES: ProspectStatus[] = ["À contacter", "Relance 1", "Relance 2"];

function stageRank(status: ProspectStatus): number {
  const idx = PROSPECTION_STAGES.indexOf(status);
  return idx === -1 ? -1 : idx;
}

export function isInteractionChannel(value: string): value is InteractionChannel {
  return (INTERACTION_CHANNELS as readonly string[]).includes(value);
}

export function isInteractionKind(value: string): value is InteractionKind {
  return (INTERACTION_KINDS as readonly string[]).includes(value);
}

export function isCommercialActivityType(actionType: string): boolean {
  return (COMMERCIAL_ACTIVITY_TYPES as readonly string[]).includes(actionType);
}

export function isInternalActivityType(actionType: string): boolean {
  return (INTERNAL_ACTIVITY_TYPES as readonly string[]).includes(actionType);
}

export function normalizeInteractionChannel(
  value: string | null | undefined
): InteractionChannel | null {
  if (!value) return null;
  const raw = value.trim().toLowerCase();
  if (raw === "email" || raw === "mail" || raw === "e-mail") return "email";
  if (raw === "message" || raw === "whatsapp" || raw === "sms" || raw === "linkedin") return "message";
  if (raw === "call" || raw === "appel" || raw === "téléphone" || raw === "telephone") return "call";
  if (value === "Email") return "email";
  if (value === "Message" || value === "WhatsApp") return "message";
  if (value === "Téléphone" || value === "Appel") return "call";
  return isInteractionChannel(raw) ? raw : null;
}

export function channelActionType(channel: InteractionChannel): "email" | "message" | "call" {
  return channel;
}

export function defaultInteractionKindForStage(status: ProspectStatus): InteractionKind {
  switch (migrateProspectStatus(status)) {
    case "À contacter":
      return "first_contact";
    case "Relance 1":
      return "follow_up_1";
    case "Relance 2":
      return "follow_up_2";
    default:
      return "other";
  }
}

/**
 * Avance l'étape commerciale après une interaction, sans jamais reculer
 * et sans toucher Relais / En discussion / Démo / Client / Fermé.
 */
export function nextStageAfterInteraction(
  currentStatus: string,
  kind: InteractionKind
): ProspectStatus {
  const current = migrateProspectStatus(currentStatus);
  if (isClosedProspectStatus(current)) return current;
  if (!PROSPECTION_STAGES.includes(current)) return current;

  const target: ProspectStatus | null =
    kind === "first_contact"
      ? "Relance 1"
      : kind === "follow_up_1"
        ? "Relance 2"
        : kind === "follow_up_2" || kind === "follow_up_3"
          ? "Relance 2"
          : null;

  if (!target) return current;
  if (stageRank(target) > stageRank(current)) return target;
  return current;
}

export function interactionTitle(channel: InteractionChannel, kind: InteractionKind): string {
  if (channel === "email") {
    if (kind === "first_contact") return "Premier contact envoyé";
    if (kind === "follow_up_1") return "Relance 1 envoyée";
    if (kind === "follow_up_2") return "Relance 2 envoyée";
    if (kind === "follow_up_3") return "Relance 3 envoyée";
    return "Email envoyé";
  }
  if (channel === "message") {
    if (kind === "first_contact") return "Premier message envoyé";
    if (kind === "follow_up_1") return "Relance 1 par message";
    if (kind === "follow_up_2") return "Relance 2 par message";
    if (kind === "follow_up_3") return "Relance 3 par message";
    return "Message envoyé";
  }
  if (kind === "first_contact") return "Premier appel effectué";
  if (kind === "follow_up_1") return "Relance 1 par appel";
  if (kind === "follow_up_2") return "Relance 2 par appel";
  if (kind === "follow_up_3") return "Relance 3 par appel";
  return "Appel effectué";
}

export type ApplyInteractionInput = {
  currentStatus: string;
  nextFollowUp: string | null;
  channel: InteractionChannel;
  kind: InteractionKind;
  occurredOn: string;
  description?: string | null;
  /** Nouvelle échéance facultative, après traitement de l'ancienne. */
  nextFollowUpAfter?: string | null;
};

export type ApplyInteractionResult = {
  status: ProspectStatus;
  lastAction: string;
  lastActionAt: string;
  contactChannel: string;
  nextFollowUp: string | null;
  title: string;
  description: string | null;
  actionType: "email" | "message" | "call";
  channelLabel: string;
};

export function applyInteraction(input: ApplyInteractionInput): ApplyInteractionResult {
  const title = interactionTitle(input.channel, input.kind);
  const occurredOn = dateOnly(input.occurredOn);
  const nextAfter = input.nextFollowUpAfter ? dateOnly(input.nextFollowUpAfter) : null;
  const closed = isClosedProspectStatus(migrateProspectStatus(input.currentStatus));

  return {
    status: nextStageAfterInteraction(input.currentStatus, input.kind),
    lastAction: title,
    lastActionAt: `${occurredOn}T12:00:00.000Z`,
    contactChannel: INTERACTION_CHANNEL_LABELS[input.channel],
    nextFollowUp: closed ? null : nextAfter,
    title,
    description: input.description?.trim() || null,
    actionType: channelActionType(input.channel),
    channelLabel: INTERACTION_CHANNEL_LABELS[input.channel],
  };
}

export function inferLegacyInteraction(
  actionType: string,
  currentStatus: string,
  storedKind?: string | null,
  storedChannel?: string | null
): { channel: InteractionChannel | null; kind: InteractionKind | null } {
  if (storedKind && isInteractionKind(storedKind)) {
    return {
      channel: normalizeInteractionChannel(storedChannel) ?? inferChannelFromActionType(actionType),
      kind: storedKind,
    };
  }

  const channel = normalizeInteractionChannel(storedChannel) ?? inferChannelFromActionType(actionType);
  if (!channel && !["mail_sent", "call_made", "email", "call", "message", "whatsapp", "first_contact", "follow_up"].includes(actionType)) {
    return { channel: null, kind: null };
  }

  const status = migrateProspectStatus(currentStatus);
  if (actionType === "first_contact") {
    return { channel: channel ?? "email", kind: "first_contact" };
  }
  if (actionType === "follow_up") {
    return {
      channel: channel ?? "email",
      kind: status === "Relance 1" ? "follow_up_1" : status === "Relance 2" ? "follow_up_2" : "other",
    };
  }
  if (actionType === "mail_sent" || actionType === "call_made" || actionType === "email" || actionType === "call" || actionType === "message" || actionType === "whatsapp") {
    const inferredChannel =
      channel ??
      (actionType === "call_made" || actionType === "call"
        ? "call"
        : actionType === "message" || actionType === "whatsapp"
          ? "message"
          : "email");
    const kind = status === "À contacter" ? "first_contact" : "other";
    return { channel: inferredChannel, kind };
  }

  return { channel, kind: null };
}

function inferChannelFromActionType(actionType: string): InteractionChannel | null {
  if (actionType === "email" || actionType === "mail_sent") return "email";
  if (actionType === "message" || actionType === "whatsapp" || actionType === "linkedin") return "message";
  if (actionType === "call" || actionType === "call_made") return "call";
  return null;
}

export function lastContactLabel(lastActionAt: string | null | undefined, today = dateOnly(new Date())): string | null {
  if (!lastActionAt) return null;
  const day = dateOnly(lastActionAt);
  if (day === today) return "Dernier contact : aujourd'hui";
  const yesterday = new Date(`${today}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === dateOnly(yesterday)) return "Dernier contact : hier";
  return null;
}
