import { redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { JoinProjectClient } from "@/components/projects/JoinProjectClient";

export default async function JoinProjectPage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/join");
  return <JoinProjectClient />;
}
