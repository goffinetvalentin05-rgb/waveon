import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ClientsClient } from "@/components/crm/ClientsClient";
import { enrichProspects } from "@/lib/crm/enrich-prospects";
import { parseProspectListParams } from "@/lib/crm/prospect-list-params";
import { fetchProspectList } from "@/lib/crm/prospect-query";
import { requireProjectModule } from "@/lib/projects/guard";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toUrlSearchParams(raw: Record<string, string | string[] | undefined>) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") sp.set(key, value);
    else if (Array.isArray(value)) sp.set(key, value.join(","));
  }
  return sp;
}

export default async function ProjectClientsPage({ params, searchParams }: Props) {
  const { id } = await params;
  await requireProjectModule(id, "prospects");
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const sp = toUrlSearchParams(await searchParams);
  const parsed = parseProspectListParams(sp, true);
  const listParams = {
    ...parsed,
    projectId: id,
    clientsOnly: true,
    sort: sp.get("sort") ? parsed.sort : "last_action_at",
    order: sp.get("order") ? parsed.order : ("desc" as const),
    pageSize: 200,
  };

  const [{ data, count }, { count: totalAll }] = await Promise.all([
    fetchProspectList(supabase, user.id, listParams),
    supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("project_id", id)
      .eq("status", "Client")
      .is("archived_at", null),
  ]);

  return (
    <ClientsClient
      initial={await enrichProspects(supabase, user.id, (data ?? []) as Record<string, unknown>[])}
      total={count ?? 0}
      totalAll={totalAll ?? 0}
      projectId={id}
    />
  );
}
