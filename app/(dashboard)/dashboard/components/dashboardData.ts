"use client";

import type { User } from "@supabase/supabase-js";

export type RawRow = Record<string, unknown>;

export type ProspectStatus =
  | "Nouveau"
  | "En conversation"
  | "Appel booké"
  | "Closé";

export type ProspectItem = {
  id: string;
  name: string;
  phone: string;
  status: ProspectStatus;
  createdAt: string;
};

export type ConversationMessage = {
  id: string;
  content: string;
  direction: "in" | "out";
  createdAt: string;
};

export type ConversationItem = {
  id: string;
  prospectName: string;
  updatedAt: string;
  messages: ConversationMessage[];
};

export type BookingItem = {
  id: string;
  prospectName: string;
  status: string;
  scheduledAt: string;
};

export type ProfileItem = {
  id: string;
  fullName: string;
  email: string;
  whatsappNumber: string;
  bookingLink: string;
  offerDescription: string;
  communicationStyle: string;
  commonObjections: string;
};

const DEFAULT_DATE = new Date(0).toISOString();

export const cardClass =
  "rounded-2xl border border-[#39FF14]/15 bg-[#0F0F0F] p-5";

export const statusBadgeClass: Record<ProspectStatus, string> = {
  Nouveau: "border-blue-400/30 bg-blue-400/10 text-blue-200",
  "En conversation": "border-amber-400/30 bg-amber-400/10 text-amber-200",
  "Appel booké": "border-[#39FF14]/30 bg-[#39FF14]/10 text-[#39FF14]",
  "Closé": "border-zinc-500/40 bg-zinc-500/15 text-zinc-200",
};

export function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function firstNameFromProfile(profile: ProfileItem | null): string {
  const fullName = profile?.fullName?.trim() ?? "";
  if (!fullName) return "toi";
  return fullName.split(" ")[0] || "toi";
}

export function mapProfile(
  profileRow: RawRow | null,
  user: User,
  fallbackEmail = ""
): ProfileItem {
  return {
    id: user.id,
    fullName: pickString(profileRow, ["full_name", "name"], ""),
    email: pickString(profileRow, ["email"], user.email ?? fallbackEmail),
    whatsappNumber: pickString(
      profileRow,
      ["whatsapp_number", "phone", "phone_number"],
      ""
    ),
    bookingLink: pickString(profileRow, ["booking_link", "calendly_link"], ""),
    offerDescription: pickString(profileRow, ["offer_description"], ""),
    communicationStyle: pickString(profileRow, ["communication_style"], ""),
    commonObjections: pickString(profileRow, ["common_objections"], ""),
  };
}

export function mapProspect(row: RawRow): ProspectItem {
  return {
    id: pickString(row, ["id"], crypto.randomUUID()),
    name: pickString(row, ["name", "full_name", "prospect_name"], "Sans nom"),
    phone: pickString(
      row,
      ["phone", "phone_number", "whatsapp_number", "number"],
      "-"
    ),
    status: normalizeProspectStatus(
      pickString(row, ["status", "stage"], "Nouveau")
    ),
    createdAt: pickString(row, ["created_at", "date", "updated_at"], DEFAULT_DATE),
  };
}

export function mapBooking(row: RawRow): BookingItem {
  const nestedProspect = asRecord(row["prospect"]);
  return {
    id: pickString(row, ["id"], crypto.randomUUID()),
    prospectName:
      pickString(row, ["prospect_name", "name"], "") ||
      pickString(nestedProspect, ["name", "full_name"], "Prospect"),
    status: pickString(row, ["status"], "Planifie"),
    scheduledAt: pickString(
      row,
      ["scheduled_at", "date", "created_at", "start_time"],
      DEFAULT_DATE
    ),
  };
}

export function mapConversation(row: RawRow): ConversationItem {
  const nestedProspect = asRecord(row["prospect"]);
  const messagesArray = pickArray(row, ["messages", "chat_messages", "history"]);
  const messages =
    messagesArray.length > 0
      ? messagesArray.map((item, index) => mapConversationMessage(item, index))
      : mapFallbackMessage(row);

  return {
    id: pickString(row, ["id"], crypto.randomUUID()),
    prospectName:
      pickString(row, ["prospect_name", "name"], "") ||
      pickString(nestedProspect, ["name", "full_name"], "Prospect"),
    updatedAt: pickString(
      row,
      ["updated_at", "created_at", "last_message_at"],
      DEFAULT_DATE
    ),
    messages,
  };
}

function mapConversationMessage(raw: unknown, index: number): ConversationMessage {
  const row = asRecord(raw);
  const directionRaw = pickString(row, ["direction", "sender", "role"], "out")
    .toLowerCase()
    .trim();
  const direction =
    directionRaw === "in" ||
    directionRaw === "incoming" ||
    directionRaw === "client" ||
    directionRaw === "prospect"
      ? "in"
      : "out";

  return {
    id: pickString(row, ["id"], `msg-${index}`),
    content: pickString(row, ["content", "text", "body"], ""),
    direction,
    createdAt: pickString(row, ["created_at", "timestamp"], DEFAULT_DATE),
  };
}

function mapFallbackMessage(row: RawRow): ConversationMessage[] {
  const lastMessage = pickString(row, ["last_message", "message"], "");
  if (!lastMessage) return [];

  return [
    {
      id: `fallback-${pickString(row, ["id"], "0")}`,
      content: lastMessage,
      direction: "out",
      createdAt: pickString(
        row,
        ["last_message_at", "updated_at", "created_at"],
        DEFAULT_DATE
      ),
    },
  ];
}

function normalizeProspectStatus(rawStatus: string): ProspectStatus {
  const status = rawStatus.toLowerCase().trim();
  if (status.includes("conver")) return "En conversation";
  if (status.includes("book")) return "Appel booké";
  if (status.includes("clos")) return "Closé";
  return "Nouveau";
}

function pickString(
  row: RawRow | null,
  keys: string[],
  fallback: string
): string {
  if (!row) return fallback;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return fallback;
}

function pickArray(row: RawRow, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = row[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function asRecord(value: unknown): RawRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as RawRow;
}
