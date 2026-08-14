import { NextResponse } from "next/server";
import { requireUser, todayISO } from "@/lib/crm/server";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const today = todayISO();
  const range = new URL(request.url).searchParams.get("range");

  if (range === "board") {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const [{ data: open, error: openError }, { data: done, error: doneError }] = await Promise.all([
      supabase
        .from("daily_tasks")
        .select("*, prospect:prospects(id, club_name, status)")
        .eq("user_id", user.id)
        .eq("completed", false)
        .order("due_date", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("daily_tasks")
        .select("*, prospect:prospects(id, club_name, status)")
        .eq("user_id", user.id)
        .eq("completed", true)
        .gte("completed_at", since.toISOString())
        .order("completed_at", { ascending: false })
        .limit(80),
    ]);

    if (openError) return NextResponse.json({ error: openError.message }, { status: 500 });
    if (doneError) return NextResponse.json({ error: doneError.message }, { status: 500 });

    const openTasks = open ?? [];
    return NextResponse.json({
      today: openTasks.filter((t) => t.due_date <= today),
      upcoming: openTasks.filter((t) => t.due_date > today),
      completed: done ?? [],
      todayISO: today,
    });
  }

  const { data: tasks, error } = await supabase
    .from("daily_tasks")
    .select("*, prospect:prospects(id, club_name, status)")
    .eq("user_id", user.id)
    .eq("due_date", today)
    .order("completed", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Prospects à relancer aujourd'hui (même sans tâche créée)
  const { data: dueProspects } = await supabase
    .from("prospects")
    .select("id, club_name, status, next_follow_up, last_action")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .lte("next_follow_up", today)
    .not("status", "in", '("Client","Refus","Pas intéressé")')
    .order("next_follow_up", { ascending: true });

  // Démos prévues aujourd'hui / à venir bientôt
  const { data: demos } = await supabase
    .from("prospects")
    .select("id, club_name, status, demo_at")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .eq("status", "Démonstration")
    .order("demo_at", { ascending: true });

  return NextResponse.json({
    tasks: tasks ?? [],
    dueProspects: dueProspects ?? [],
    demos: demos ?? [],
    today,
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json();
  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("daily_tasks")
    .insert({
      user_id: user.id,
      title,
      due_date: body.due_date || todayISO(),
      prospect_id: body.prospect_id || null,
      task_kind: body.task_kind || "custom",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data }, { status: 201 });
}
