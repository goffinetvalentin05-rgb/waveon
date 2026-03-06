"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  cardClass,
  firstNameFromProfile,
  formatDate,
  mapProfile,
  mapProspect,
  statusBadgeClass,
  type ProfileItem,
  type ProspectItem,
  type RawRow,
} from "./components/dashboardData";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileItem | null>(null);
  const [latestProspects, setLatestProspects] = useState<ProspectItem[]>([]);
  const [stats, setStats] = useState({
    prospectsTotal: 0,
    conversationsActive: 0,
    callsBooked: 0,
  });

  const conversionRate = useMemo(() => {
    if (stats.prospectsTotal <= 0) return 0;
    return Math.round((stats.callsBooked / stats.prospectsTotal) * 100);
  }, [stats.callsBooked, stats.prospectsTotal]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace("/login");
        return;
      }
      const currentUserId = session.user.id;
      setUserId(currentUserId);
      await fetchDashboard(currentUserId, session.user.email ?? "");
      setLoading(false);
    };
    void init();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`dashboard-overview-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "prospects",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await fetchDashboard(userId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await fetchDashboard(userId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await fetchDashboard(userId);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080808] text-white/70">
        Chargement de ton espace...
      </div>
    );
  }

  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold text-white">
          Bonjour {firstNameFromProfile(profile)} 👋
        </h1>
        <p className="mt-1 text-sm text-white/70">
          Ton agent WhatsApp tourne en ce moment.
        </p>
      </header>

      {error ? (
        <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Prospects total" value={stats.prospectsTotal} />
        <StatCard label="Conversations actives" value={stats.conversationsActive} />
        <StatCard label="Appels bookés" value={stats.callsBooked} />
        <StatCard label="Taux de conversion" value={`${conversionRate}%`} />
      </section>

      <section className={`${cardClass} mt-6`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Derniers prospects</h2>
          <span className="text-xs text-white/60">
            {latestProspects.length} résultat(s)
          </span>
        </div>

        {latestProspects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#39FF14]/20 bg-[#080808] px-4 py-5 text-sm text-white/65">
            Aucun prospect pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#39FF14]/15 text-white/60">
                  <th className="px-2 py-3 font-medium">Nom</th>
                  <th className="px-2 py-3 font-medium">Numéro</th>
                  <th className="px-2 py-3 font-medium">Statut</th>
                  <th className="px-2 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {latestProspects.map((prospect) => (
                  <tr
                    key={prospect.id}
                    className="border-b border-[#39FF14]/10 last:border-none"
                  >
                    <td className="px-2 py-3 text-white">{prospect.name}</td>
                    <td className="px-2 py-3 text-white/80">{prospect.phone}</td>
                    <td className="px-2 py-3">
                      <span
                        className={`rounded-full border px-2 py-1 text-xs ${statusBadgeClass[prospect.status]}`}
                      >
                        {prospect.status}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-white/70">
                      {formatDate(prospect.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );

  async function fetchDashboard(currentUserId: string, fallbackEmail = "") {
    setError(null);
    const [
      { data: profileRow, error: profileError },
      { count: prospectsCount, error: prospectsCountError },
      { count: conversationsCount, error: conversationsCountError },
      { count: bookingsCount, error: bookingsCountError },
      { data: prospectsRows, error: prospectsRowsError },
      { data: userData, error: userError },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", currentUserId).maybeSingle(),
      supabase
        .from("prospects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", currentUserId),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", currentUserId),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", currentUserId),
      supabase
        .from("prospects")
        .select("*")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.auth.getUser(),
    ]);

    const firstError =
      profileError ??
      prospectsCountError ??
      conversationsCountError ??
      bookingsCountError ??
      prospectsRowsError ??
      userError;

    if (firstError) {
      setError(firstError.message);
      return;
    }

    const user = userData.user;
    if (user) {
      setProfile(mapProfile((profileRow ?? null) as RawRow | null, user, fallbackEmail));
    }

    setStats({
      prospectsTotal: prospectsCount ?? 0,
      conversationsActive: conversationsCount ?? 0,
      callsBooked: bookingsCount ?? 0,
    });

    setLatestProspects(((prospectsRows ?? []) as RawRow[]).map(mapProspect));
  }
}

type StatCardProps = {
  label: string;
  value: string | number;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className={cardClass}>
      <p className="text-sm text-white/65">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[#39FF14]">{value}</p>
    </div>
  );
}


