import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { firstNameFromDisplay } from "@/lib/brand/config";
import { loadCockpitData } from "@/lib/home/cockpit";
import { CockpitDashboard } from "@/components/home/CockpitDashboard";

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

  const data = await loadCockpitData(supabase, user.id);
  const dateLabel = format(new Date(), "EEEE d MMMM", { locale: fr });

  return (
    <CockpitDashboard
      firstName={firstNameFromDisplay(displayName)}
      dateLabel={dateLabel}
      data={data}
    />
  );
}
