import { notFound } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ProspectDetailClient2 } from "@/components/crm/ProspectDetailClient2";
import { normalizeProspectFromDb } from "@/lib/crm/prospect-payload";
import type { Prospect, ProspectActivity } from "@/lib/crm/types";

type Props = { params: Promise<{ id: string }> };

export default async function CrmProspectDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: prospect } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!prospect) notFound();

  const { data: activities } = await supabase
    .from("prospect_activities")
    .select("*")
    .eq("prospect_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <ProspectDetailClient2
      prospect={normalizeProspectFromDb(prospect as Record<string, unknown>) as Prospect}
      activities={(activities ?? []) as ProspectActivity[]}
    />
  );
}
