import { isClosedProspectStatus, parseClosedReason } from "@/lib/crm/closed";
import { inferLegacyInteraction, nextStageAfterInteraction } from "@/lib/crm/interactions";
import { defaultNextActionFor } from "@/lib/crm/next-action";
import { parseStatusChangePayload } from "@/lib/crm/status";
import { syncProspectFollowUpTask } from "@/lib/crm/sync-follow-up-task";
import { syncDemoArtifactsForStatus } from "@/lib/crm/sync-demo-schedule";
import type { Prospect, ProspectActivity, ProspectStatus } from "@/lib/crm/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function parseMaybeJson(text: string | null): unknown | null {
  if (!text) return null;
  if (!text.trim().startsWith("{")) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseDemoAt(description: string | null): Date | null {
  const parsed = parseMaybeJson(description);
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const demoAtRaw = obj.demoAt ?? obj.demo_at;
  if (!demoAtRaw) return null;
  const d = new Date(String(demoAtRaw));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function activityWhen(activity: ProspectActivity): Date {
  return new Date(activity.occurred_at || activity.created_at);
}

function looksLikeDemoDone(activity: ProspectActivity): boolean {
  if (activity.action_type === "demo_scheduled") return false;
  const title = (activity.title || "").toLowerCase();
  return title.includes("démo effectuée") || title.includes("demo effectuée") || title.includes("démo faite");
}

function isHumanContact(actionType: string): boolean {
  return [
    "mail_sent",
    "call_made",
    "email",
    "message",
    "call",
    "whatsapp",
    "linkedin",
    "first_contact",
    "follow_up",
    "meeting",
    "reply",
    "offer",
    "note",
    "other",
  ].includes(actionType);
}

/**
 * Recalcule statut, dernier contact et tâches dérivées à partir de l'historique.
 * Ne réinvente pas une date de relance : `next_follow_up` reste un champ indépendant,
 * simplement nettoyé pour les clients / fermés.
 */
export async function recomputeProspectDerivatives(
  supabase: SupabaseClient,
  userId: string,
  prospectId: string
): Promise<{ prospect: Prospect; activities: ProspectActivity[] }> {
  const { data: prospectRow } = await supabase
    .from("prospects")
    .select("*")
    .eq("user_id", userId)
    .eq("id", prospectId)
    .maybeSingle();

  if (!prospectRow) throw new Error("Introuvable");

  const { data: activitiesRaw } = await supabase
    .from("prospect_activities")
    .select("*")
    .eq("user_id", userId)
    .eq("prospect_id", prospectId)
    .order("occurred_at", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  const activities = (activitiesRaw ?? []) as ProspectActivity[];

  let currentStatus: ProspectStatus = "À contacter";
  let lastAction: string | null = null;
  let lastActionAt: string | null = null;
  let contactChannel: string | null = (prospectRow.contact_channel as string | null) ?? null;
  let demoAtIso: string | null = null;
  let closedReason: string | null = null;
  let closedNote: string | null = null;

  for (const a of activities) {
    const when = activityWhen(a);

    if (a.action_type === "created" || a.action_type === "imported") {
      continue;
    }

    if (a.action_type === "status_change") {
      const parsed = parseStatusChangePayload(a.description);
      if (!parsed.to) continue;
      currentStatus = parsed.to;
      demoAtIso = parsed.to === "Démo" || parsed.to === "Décision en attente" ? when.toISOString() : demoAtIso;
      if (parsed.to === "Fermé") {
        closedReason = parseClosedReason(parsed.closed_reason) ?? closedReason ?? "Autre";
        closedNote = parsed.closed_note;
      } else {
        closedReason = null;
        closedNote = null;
      }
      continue;
    }

    if (a.action_type === "client") {
      currentStatus = "Client";
      lastAction = a.title || "Devenu client";
      lastActionAt = a.occurred_at || a.created_at;
      closedReason = null;
      closedNote = null;
      continue;
    }

    if (a.action_type === "refus") {
      currentStatus = "Fermé";
      lastAction = a.title || "Fermé";
      lastActionAt = a.occurred_at || a.created_at;
      const parsed = parseMaybeJson(a.description);
      const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
      closedReason = parseClosedReason(obj?.closed_reason) ?? parseClosedReason(a.description) ?? "Pas intéressé";
      closedNote = typeof obj?.closed_note === "string" ? obj.closed_note : null;
      continue;
    }

    if (a.action_type === "demo_done" || looksLikeDemoDone(a)) {
      if (!isClosedProspectStatus(currentStatus)) {
        currentStatus = "Décision en attente";
      }
      lastAction = a.title || "Démo effectuée";
      lastActionAt = a.occurred_at || a.created_at;
      demoAtIso = (parseDemoAt(a.description) ?? when).toISOString();
      continue;
    }

    if (a.action_type === "demo_scheduled" || a.action_type === "demo") {
      const demoAt = parseDemoAt(a.description);
      currentStatus = "Démo";
      lastAction = a.title || "Démonstration planifiée";
      lastActionAt = a.occurred_at || a.created_at;
      demoAtIso = (demoAt ?? when).toISOString();
      continue;
    }

    if (isHumanContact(a.action_type)) {
      const inferred = inferLegacyInteraction(
        a.action_type,
        currentStatus,
        a.interaction_type,
        a.channel
      );
      if (inferred.kind) {
        currentStatus = nextStageAfterInteraction(currentStatus, inferred.kind);
      }
      lastAction = a.title || lastAction;
      lastActionAt = a.occurred_at || a.created_at;
      if (a.channel) contactChannel = a.channel;
      continue;
    }

    if (a.action_type === "archived" || a.action_type === "restored") {
      continue;
    }

    lastAction = a.title;
    lastActionAt = a.occurred_at || a.created_at;
  }

  if (currentStatus !== "Fermé") {
    closedReason = null;
    closedNote = null;
  }

  const nextFollowUp = isClosedProspectStatus(currentStatus)
    ? null
    : ((prospectRow.next_follow_up as string | null) ?? null);

  await supabase
    .from("prospects")
    .update({
      status: currentStatus,
      last_action: lastAction,
      last_action_at: lastActionAt,
      next_follow_up: nextFollowUp,
      next_action: isClosedProspectStatus(currentStatus)
        ? null
        : (prospectRow.next_action as string | null) ?? defaultNextActionFor(currentStatus),
      demo_at: currentStatus === "Démo" || currentStatus === "Décision en attente" ? demoAtIso : null,
      closed_reason: closedReason,
      closed_note: closedNote,
      contact_channel: contactChannel,
    })
    .eq("id", prospectId)
    .eq("user_id", userId);

  await syncProspectFollowUpTask(supabase, {
    userId,
    prospectId,
    clubName: (prospectRow.club_name as string) ?? "",
    status: currentStatus,
    nextFollowUp,
  });

  await syncDemoArtifactsForStatus(supabase, userId, prospectId, currentStatus);

  const { data: updatedProspect } = await supabase
    .from("prospects")
    .select("*")
    .eq("user_id", userId)
    .eq("id", prospectId)
    .maybeSingle();

  const { data: updatedActivities } = await supabase
    .from("prospect_activities")
    .select("*")
    .eq("user_id", userId)
    .eq("prospect_id", prospectId)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });

  return {
    prospect: updatedProspect as Prospect,
    activities: (updatedActivities ?? []) as ProspectActivity[],
  };
}
