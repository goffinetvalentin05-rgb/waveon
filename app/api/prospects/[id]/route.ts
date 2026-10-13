import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { nullIfEmpty, normalizeProspectFromDb } from "@/lib/crm/prospect-payload";
import { upsertPrimaryContactFromProspectFields } from "@/lib/crm/sync-primary-contact";
import { syncProspectFollowUpTask } from "@/lib/crm/sync-follow-up-task";
import { migrateProspectStatus } from "@/lib/crm/status";
import { isClosedProspectStatus } from "@/lib/crm/closed";
import type { Prospect } from "@/lib/crm/types";
import { isProjectAssignee, resolveAssigneeName } from "@/lib/projects/assignee";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase } = auth;
  const { id } = await params;

  const { data: prospect, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { data: activities } = await supabase
    .from("prospect_activities")
    .select("*")
    .eq("prospect_id", id)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });

  const normalized = normalizeProspectFromDb(prospect as Record<string, unknown>) as Prospect;
  const assignee = await resolveAssigneeName(
    supabase,
    normalized.project_id,
    normalized.assigned_user_id
  );

  const { data: contacts } = await supabase
    .from("prospect_contacts")
    .select("*")
    .eq("prospect_id", id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  return NextResponse.json({
    prospect: { ...normalized, assignee, people_count: (contacts ?? []).length },
    activities: activities ?? [],
    contacts: contacts ?? [],
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "club_name",
    "sport",
    "canton",
    "ville",
    "contact_name",
    "contact_function",
    "phone",
    "email",
    "website",
    "notes",
    "project_id",
    "assigned_to",
    "assigned_user_id",
    "potential_value",
    "contact_channel",
    "tags",
    "next_follow_up",
    "next_action",
    "logo_url",
    "address",
    "country",
    "linkedin_url",
    "source",
    "priority",
  ] as const;

  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      const val = body[key];
      // tags est text[] NOT NULL DEFAULT '{}' — jamais null.
      if (key === "tags") {
        if (Array.isArray(val)) {
          patch.tags = val.map((t) => String(t).trim()).filter(Boolean);
        } else if (typeof val === "string") {
          patch.tags = val
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        } else {
          patch.tags = [];
        }
      } else if (typeof val === "string") {
        patch[key] = nullIfEmpty(val);
        if (key === "phone") {
          patch.phone_number = nullIfEmpty(val);
        }
      } else if (key === "potential_value") {
        patch.potential_value = val === null || val === "" ? null : Number(val);
      } else {
        patch[key] = val;
      }
    }
  }

  if ("club_name" in patch && !patch.club_name) {
    return NextResponse.json({ error: "Nom du club requis" }, { status: 400 });
  }

  if (patch.club_name && typeof patch.club_name === "string") {
    patch.name = patch.club_name;
  }

  if ("assigned_user_id" in patch && patch.assigned_user_id) {
    const { data: current } = await supabase
      .from("prospects")
      .select("project_id")
      .eq("id", id)
      .maybeSingle();
    const projectId =
      (typeof patch.project_id === "string" && patch.project_id) || current?.project_id || null;
    if (!projectId) {
      return NextResponse.json(
        { error: "Impossible d’attribuer un responsable hors projet." },
        { status: 400 }
      );
    }
    const ok = await isProjectAssignee(supabase, projectId, String(patch.assigned_user_id));
    if (!ok) {
      return NextResponse.json(
        { error: "Le responsable doit être un membre du projet." },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from("prospects")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if ("next_follow_up" in patch) {
    const status = migrateProspectStatus(String(data.status ?? "À contacter"));
    const nextFollowUp = isClosedProspectStatus(status)
      ? null
      : data.next_follow_up
        ? String(data.next_follow_up).slice(0, 10)
        : null;
    if (isClosedProspectStatus(status) && data.next_follow_up) {
      await supabase.from("prospects").update({ next_follow_up: null }).eq("id", id);
    }
    await syncProspectFollowUpTask(supabase, {
      userId: user.id,
      prospectId: id,
      clubName: String(data.club_name ?? ""),
      status,
      nextFollowUp,
    });
  }

  const contactKeys = ["contact_name", "contact_function", "email", "phone"] as const;
  if (contactKeys.some((k) => k in patch)) {
    await upsertPrimaryContactFromProspectFields(supabase, {
      userId: user.id,
      prospectId: id,
      fields: {
        contact_name: data.contact_name,
        contact_function: data.contact_function,
        email: data.email,
        phone: data.phone,
      },
    });
  }

  return NextResponse.json({
    prospect: normalizeProspectFromDb(data as Record<string, unknown>),
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  let confirmClubName = "";
  try {
    const body = await request.json();
    confirmClubName = typeof body?.confirm_club_name === "string" ? body.confirm_club_name.trim() : "";
  } catch {
    confirmClubName = "";
  }

  const { data: prospect, error: fetchError } = await supabase
    .from("prospects")
    .select("id, club_name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (!confirmClubName || confirmClubName !== prospect.club_name) {
    return NextResponse.json(
      { error: "Le nom du club ne correspond pas. Saisissez le nom exact pour confirmer." },
      { status: 400 }
    );
  }

  // Suppression explicite des tâches (sécurité si CASCADE pas encore appliqué)
  const { error: tasksError } = await supabase
    .from("daily_tasks")
    .delete()
    .eq("prospect_id", id)
    .eq("user_id", user.id);

  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 });
  }

  // Les activités partent en CASCADE ; on les purge aussi explicitement
  const { error: activitiesError } = await supabase
    .from("prospect_activities")
    .delete()
    .eq("prospect_id", id)
    .eq("user_id", user.id);

  if (activitiesError) {
    return NextResponse.json({ error: activitiesError.message }, { status: 500 });
  }

  const { error } = await supabase
    .from("prospects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, message: "Le prospect a été supprimé." });
}
