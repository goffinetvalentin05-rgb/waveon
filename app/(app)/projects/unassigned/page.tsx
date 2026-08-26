import Link from "next/link";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";
import { fetchProjects } from "@/lib/projects/server";

export default async function UnassignedPage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const projects = await fetchProjects(supabase, user.id, false);
  const [prospects, tasks, notes] = await Promise.all([
    supabase
      .from("prospects")
      .select("id, club_name, status")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .is("project_id", null)
      .order("club_name"),
    supabase
      .from("daily_tasks")
      .select("id, title, status")
      .eq("user_id", user.id)
      .eq("scope", "project")
      .is("project_id", null)
      .neq("status", "Terminé")
      .order("due_date"),
    supabase
      .from("workspace_notes")
      .select("id, title")
      .eq("user_id", user.id)
      .eq("scope", "project")
      .is("project_id", null)
      .order("updated_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="text-xs text-wo-muted hover:text-wo-text">
          ← Tous les projets
        </Link>
        <h1 className={`${ui.h1} mt-2`}>Sans projet</h1>
        <p className="mt-1 text-sm text-wo-muted">
          Données business non rattachées. Assignez-les à un projet quand vous le souhaitez — rien n&apos;a été
          supprimé.
        </p>
      </div>

      {projects.length > 0 ? (
        <p className="text-sm text-wo-muted">
          Projets disponibles : {projects.map((p) => p.name).join(", ")}
        </p>
      ) : null}

      <section className={`${ui.card} p-5`}>
        <h2 className={ui.h2}>Prospects</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(prospects.data ?? []).map((p) => (
            <li key={p.id}>
              <Link href={`/crm/prospects/${p.id}`} className="text-wo-text hover:text-white">
                {p.club_name} <span className="text-wo-dim">· {p.status}</span>
              </Link>
            </li>
          ))}
          {(prospects.data ?? []).length === 0 ? <li className="text-wo-dim">Aucun</li> : null}
        </ul>
      </section>
      <section className={`${ui.card} p-5`}>
        <h2 className={ui.h2}>Tâches</h2>
        <ul className="mt-3 space-y-2 text-sm text-wo-text">
          {(tasks.data ?? []).map((t) => (
            <li key={t.id}>{t.title}</li>
          ))}
          {(tasks.data ?? []).length === 0 ? <li className="text-wo-dim">Aucune</li> : null}
        </ul>
      </section>
      <section className={`${ui.card} p-5`}>
        <h2 className={ui.h2}>Notes</h2>
        <ul className="mt-3 space-y-2 text-sm text-wo-text">
          {(notes.data ?? []).map((n) => (
            <li key={n.id}>{n.title || "Sans titre"}</li>
          ))}
          {(notes.data ?? []).length === 0 ? <li className="text-wo-dim">Aucune</li> : null}
        </ul>
      </section>
    </div>
  );
}
