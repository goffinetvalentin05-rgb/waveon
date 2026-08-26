import { requireProjectModule } from "@/lib/projects/guard";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectActivityPage({ params }: Props) {
  const { id } = await params;
  await requireProjectModule(id, "activity");
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("workspace_events")
    .select("id, title, created_at, event_type")
    .eq("user_id", user.id)
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(40);

  const events = data ?? [];

  return (
    <div className={`${ui.widget} p-5 sm:p-6`}>
      <h2 className={ui.h2}>Activité du projet</h2>
      <p className="mt-1 text-sm text-wo-muted">Historique des actions visibles par les membres de ce projet uniquement.</p>
      {events.length === 0 ? (
        <p className="mt-6 text-sm text-wo-muted">Aucune activité pour le moment.</p>
      ) : (
        <ol className="mt-6 space-y-4">
          {events.map((event) => (
            <li key={event.id} className="border-l-2 border-indigo-100 pl-4">
              <p className="text-sm text-wo-text">{event.title}</p>
              <p className="mt-0.5 text-[11px] text-wo-dim">
                {format(new Date(event.created_at), "d MMMM yyyy · HH:mm", { locale: fr })}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
