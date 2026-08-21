import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { getPersonalSecurityState } from "@/lib/personal/security";
import { PersonalLockScreen } from "@/components/personal/PersonalLockScreen";

export default async function PersonalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const security = await getPersonalSecurityState(supabase, user.id);
  if (security.lockEnabled && !security.unlocked) {
    return <PersonalLockScreen />;
  }

  return <>{children}</>;
}
