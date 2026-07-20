import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ProspectsClient } from "@/components/crm/ProspectsClient";
import type { Prospect } from "@/lib/crm/types";

export default async function ClientsPage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, count } = await supabase
    .from("prospects")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .eq("status", "Client")
    .order("updated_at", { ascending: false })
    .range(0, 99);

  return (
    <ProspectsClient
      initial={(data ?? []) as Prospect[]}
      total={count ?? 0}
      clientsOnly
    />
  );
}
