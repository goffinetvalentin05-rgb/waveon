import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ProspectsClient } from "@/components/crm/ProspectsClient";
import { normalizeProspectFromDb } from "@/lib/crm/prospect-payload";
import type { Prospect } from "@/lib/crm/types";
import {
  defaultProspectListParams,
  parseProspectListParams,
} from "@/lib/crm/prospect-list-params";
import { fetchProspectList } from "@/lib/crm/prospect-query";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toUrlSearchParams(
  raw: Record<string, string | string[] | undefined>
): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") sp.set(key, value);
    else if (Array.isArray(value)) sp.set(key, value.join(","));
  }
  return sp;
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const sp = toUrlSearchParams(await searchParams);
  const params = parseProspectListParams(sp, true);

  const [{ data, count, error }, { count: totalAll }] = await Promise.all([
    fetchProspectList(supabase, user.id, params),
    supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "Client"),
  ]);

  if (error) {
    const fallback = defaultProspectListParams(true);
    return (
      <ProspectsClient
        initial={[]}
        total={0}
        totalAll={totalAll ?? 0}
        initialParams={fallback}
        clientsOnly
      />
    );
  }

  return (
    <ProspectsClient
      initial={(data ?? []).map(
        (p) => normalizeProspectFromDb(p as Record<string, unknown>) as Prospect
      )}
      total={count ?? 0}
      totalAll={totalAll ?? 0}
      initialParams={params}
      clientsOnly
    />
  );
}
