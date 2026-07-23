import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { resolveHomeSummary } from "@/lib/home/summaries";
import { getHomeModules } from "@/modules/registry";
import { HomeModuleCard } from "@/components/app/HomeModuleCard";
import { ui } from "@/lib/design/tokens";
import type { HomeSummary, HomeSummaryId } from "@/modules/types";

export default async function HomePage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const modules = getHomeModules();
  const summaryEntries = await Promise.all(
    modules.map(async (m) => {
      if (!m.homeSummaryId) return [m.id, null] as const;
      const summary = await resolveHomeSummary(
        m.homeSummaryId as HomeSummaryId,
        supabase,
        user.id
      );
      return [m.id, summary] as const;
    })
  );
  const summaries = Object.fromEntries(summaryEntries) as Record<
    string,
    HomeSummary | null
  >;

  const dateLabel = format(new Date(), "EEEE d MMMM", { locale: fr });

  return (
    <div className="space-y-10">
      <div className="crm-animate-in">
        <p className="text-sm font-medium capitalize text-slate-400">{dateLabel}</p>
        <h1 className={`${ui.h1} mt-1`}>Accueil</h1>
        <p className="mt-1.5 max-w-md text-sm text-slate-500">
          Choisissez l&apos;espace dont vous avez besoin.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {modules.map((module, index) => (
          <HomeModuleCard
            key={module.id}
            module={module}
            summary={summaries[module.id]}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
