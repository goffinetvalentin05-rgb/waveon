import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ProspectsClient } from "@/components/crm/ProspectsClient";
import { normalizeProspectFromDb } from "@/lib/crm/prospect-payload";
import type { Prospect } from "@/lib/crm/types";
import { parseProspectListParams } from "@/lib/crm/prospect-list-params";
import { fetchProspectList } from "@/lib/crm/prospect-query";

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

export default async function ProjectProspectsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const sp = toUrlSearchParams(await searchParams);
  if (!sp.get("project")) sp.set("project", id);
  const parsed = parseProspectListParams(sp);
  const listParams = { ...parsed, projectId: id, pageSize: parsed.pageSize === 25 ? 200 : parsed.pageSize };

  const [{ data, count }, { count: totalAll }] = await Promise.all([
    fetchProspectList(supabase, user.id, listParams),
    supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("project_id", id)
      .is("archived_at", null),
  ]);

  return (
    <ProspectsClient
      initial={(data ?? []).map((p) => normalizeProspectFromDb(p as Record<string, unknown>) as Prospect)}
      total={count ?? 0}
      totalAll={totalAll ?? 0}
      initialParams={listParams}
      projectId={id}
    />
  );
}
