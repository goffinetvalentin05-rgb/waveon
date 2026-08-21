import { addDays, formatISO } from "date-fns";
import { resolveQuickActionAt } from "@/lib/crm/actions";
import { isClosedProspectStatus, isDemoScheduledStatus } from "@/lib/crm/closed";
import type { CrmSettings, Prospect, ProspectActivity, ProspectStatus, QuickAction } from "@/lib/crm/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function dateOnly(d: Date): string {
  return formatISO(d, { representation: "date" });
}

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

function parseStatusChangeToStatus(description: string | null): ProspectStatus | null {
  if (!description) return null;
  const parsed = parseMaybeJson(description);
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    const to = obj.to ?? obj.toStatus ?? obj.status;
    if (typeof to === "string") {
      return to as ProspectStatus;
    }
  }
  // Fallback: description stocké comme valeur brute ("Client", etc.)
  if (typeof description === "string") {
    return description.trim() as ProspectStatus;
  }
  return null;
}

function isTerminalStatus(status: ProspectStatus) {
  return isClosedProspectStatus(status);
}

function statusToNextFollowUpDate(
  status: ProspectStatus,
  actionDate: Date,
  settings: Pick<CrmSettings, "delay_relance_1_days" | "delay_relance_2_days" | "delay_relance_3_days">
): string | null {
  if (isTerminalStatus(status)) return null;

  switch (status) {
    case "À contacter":
      return dateOnly(actionDate);
    case "Contacté":
      return dateOnly(addDays(actionDate, settings.delay_relance_1_days));
    case "Répondu":
      return dateOnly(addDays(actionDate, settings.delay_relance_1_days));
    case "Démo prévue":
    case "Démo faite":
    case "Négociation":
      return dateOnly(actionDate);
    default:
      return dateOnly(actionDate);
  }
}

function taskFromStatus(clubName: string, status: ProspectStatus): {
  taskKind: "follow_up" | "first_contact" | "demo";
  title: string;
} | null {
  if (isTerminalStatus(status)) return null;
  if (status === "À contacter") {
    return { taskKind: "first_contact", title: `Premier contact ${clubName}` };
  }
  if (isDemoScheduledStatus(status) || status === "Démo faite") {
    return { taskKind: "demo", title: `Démonstration ${clubName}` };
  }
  return { taskKind: "follow_up", title: `Relancer ${clubName}` };
}

/** Recalcule statut, dernière action, prochaine relance + tâches dérivées, à partir de l'historique. */
export async function recomputeProspectDerivatives(
  supabase: SupabaseClient,
  userId: string,
  prospectId: string
): Promise<{ prospect: Prospect; activities: ProspectActivity[] }> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: prospectRow } = await supabase
    .from("prospects")
    .select("*")
    .eq("user_id", userId)
    .eq("id", prospectId)
    .maybeSingle();

  if (!prospectRow) throw new Error("Introuvable");

  const { data: settingsRow } = await supabase
    .from("crm_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const settings = (settingsRow ?? {
    delay_relance_1_days: 3,
    delay_relance_2_days: 7,
    delay_relance_3_days: 14,
  }) as CrmSettings;

  const { data: activitiesRaw } = await supabase
    .from("prospect_activities")
    .select("*")
    .eq("user_id", userId)
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  const activities = (activitiesRaw ?? []) as ProspectActivity[];

  let currentStatus: ProspectStatus = "À contacter";
  let lastAction: string | null = null;
  let lastActionAt: string | null = null;
  let nextFollowUp: string | null = null;
  let demoAtIso: string | null = null;

  const titleUpdates: { id: string; title: string }[] = [];

  const clubName = (prospectRow.club_name as string) ?? "";

  for (const a of activities) {
    const actionDate = new Date(a.created_at);

    if (a.action_type === "created" || a.action_type === "imported") {
      lastAction = a.title;
      lastActionAt = a.created_at;
      continue;
    }

    if (a.action_type === "status_change") {
      const toStatus = parseStatusChangeToStatus(a.description);
      if (!toStatus) continue;

      const computedTitle = `Statut modifié de ${currentStatus} à ${toStatus}`;
      titleUpdates.push({ id: a.id, title: computedTitle });

      currentStatus = toStatus;
      lastAction = computedTitle;
      lastActionAt = a.created_at;
      demoAtIso = isDemoScheduledStatus(toStatus) ? actionDate.toISOString() : null;
      nextFollowUp = statusToNextFollowUpDate(toStatus, actionDate, settings);
      continue;
    }

    if (
      a.action_type === "mail_sent" ||
      a.action_type === "call_made" ||
      a.action_type === "demo_scheduled" ||
      a.action_type === "client" ||
      a.action_type === "refus"
    ) {
      const demoAt = a.action_type === "demo_scheduled" ? parseDemoAt(a.description) : null;
      const result = resolveQuickActionAt(
        a.action_type as QuickAction,
        currentStatus,
        settings,
        clubName,
        actionDate,
        demoAt ?? undefined
      );

      // Mettre à jour le titre dans l'historique pour refléter le statut "avant" l'action.
      if (result.activityTitle !== a.title) {
        titleUpdates.push({ id: a.id, title: result.activityTitle });
      }

      currentStatus = result.status;
      lastAction = result.lastAction;
      lastActionAt = a.created_at;
      nextFollowUp = result.nextFollowUp;

      if (a.action_type === "demo_scheduled") {
        // Synchroniser la date de démo sur la date prévue si fournie.
        const finalDemoAt = demoAt ?? actionDate;
        demoAtIso = finalDemoAt.toISOString();
      }

      // Sécurité : si action met en terminal, on nettoie la relance.
      if (isTerminalStatus(currentStatus)) {
        nextFollowUp = null;
        demoAtIso = null;
      }
      continue;
    }

    // Note/autres : on garde la cohérence "dernière action"
    lastAction = a.title;
    lastActionAt = a.created_at;
  }

  if (isTerminalStatus(currentStatus)) {
    nextFollowUp = null;
    demoAtIso = null;
  }

  await supabase
    .from("prospects")
    .update({
      status: currentStatus,
      last_action: lastAction,
      last_action_at: lastActionAt,
      next_follow_up: nextFollowUp,
      demo_at: demoAtIso,
    })
    .eq("id", prospectId)
    .eq("user_id", userId);

  // Nettoyage des tâches dérivées (on garde les "custom")
  await supabase
    .from("daily_tasks")
    .delete()
    .eq("user_id", userId)
    .eq("prospect_id", prospectId)
    .in("task_kind", ["follow_up", "first_contact", "demo"]);

  const derived = taskFromStatus(clubName, currentStatus);
  if (derived && nextFollowUp) {
    const dueDate = nextFollowUp <= today ? today : nextFollowUp;
    await supabase.from("daily_tasks").insert({
      user_id: userId,
      prospect_id: prospectId,
      title: derived.title,
      due_date: dueDate,
      task_kind: derived.taskKind,
      completed: false,
    });
  }

  // Réécrit les titres d'historique (cohérence après modif/suppression)
  for (const u of titleUpdates) {
    await supabase.from("prospect_activities").update({ title: u.title }).eq("id", u.id);
  }

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
    .order("created_at", { ascending: false });

  return {
    prospect: updatedProspect as Prospect,
    activities: (updatedActivities ?? []) as ProspectActivity[],
  };
}

