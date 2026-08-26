import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { firstNameFromDisplay } from "@/lib/brand/config";
import { getPersonalSecurityState } from "@/lib/personal/security";
import { loadCommandCenter } from "@/lib/home/command-center";
import { HomeDashboard } from "@/components/home/HomeDashboard";

export default async function HomePage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "toi";

  const security = await getPersonalSecurityState(supabase, user.id);
  const data = await loadCommandCenter(supabase, user.id, security);

  return <HomeDashboard firstName={firstNameFromDisplay(displayName)} data={data} />;
}
