import { randomBytes } from "crypto";
import { getAppBaseUrl } from "@/lib/brand/config";

export const CALENDAR_FEED_TOKEN_BYTES = 32;
export const CALENDAR_FEED_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export function generateCalendarFeedToken(): string {
  return randomBytes(CALENDAR_FEED_TOKEN_BYTES).toString("hex");
}

/** Accepte `token` ou `token.ics`. Ne jamais journaliser la valeur brute. */
export function parseCalendarFeedToken(raw: string | null | undefined): string | null {
  const stripped = String(raw ?? "").trim().replace(/\.ics$/i, "");
  if (!CALENDAR_FEED_TOKEN_PATTERN.test(stripped)) return null;
  return stripped.toLowerCase();
}

export function calendarFeedCalendarName(projectName: string): string {
  return `${projectName.trim() || "Projet"} — Waveone`;
}

export function calendarFeedHttpsUrl(token: string, baseUrl = getAppBaseUrl()): string {
  return `${baseUrl.replace(/\/$/, "")}/api/calendar/feed/${token}.ics`;
}

export function calendarFeedWebcalUrl(httpsUrl: string): string {
  return httpsUrl.replace(/^https:\/\//i, "webcal://").replace(/^http:\/\//i, "webcal://");
}

export function prospectEventUrl(input: {
  baseUrl?: string;
  projectId: string;
  source: string | null;
  sourceId: string | null;
}): string | null {
  if (input.source !== "crm" || !input.sourceId) return null;
  const base = (input.baseUrl ?? getAppBaseUrl()).replace(/\/$/, "");
  return `${base}/projects/${input.projectId}/prospects/${input.sourceId}`;
}
