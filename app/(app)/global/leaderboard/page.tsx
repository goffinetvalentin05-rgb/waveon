import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { aggregateGlobalStats } from "@/lib/pronoclash/leaderboard-stats";
import { LeaderboardView } from "@/components/dashboard/LeaderboardView";

export default async function GlobalLeaderboardPage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: rows }, { data: predStats }] = await Promise.all([
    user
      ? supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("profiles")
      .select("id, username, total_points")
      .not("username", "is", null)
      .order("total_points", { ascending: false })
      .limit(200),
    supabase
      .from("predictions")
      .select("user_id, exact_score, correct_winner")
      .is("league_id", null),
  ]);

  const statsByUser = aggregateGlobalStats(
    (predStats ?? []) as {
      user_id: string;
      exact_score: boolean;
      correct_winner: boolean;
    }[]
  );

  type Row = {
    id: string;
    username: string | null;
    total_points: number;
  };
  const top = ((rows ?? []) as Row[]).filter(
    (r): r is Row & { username: string } => Boolean(r.username?.trim()),
  );
  const myRank = user ? top.findIndex((r) => r.id === user.id) : -1;

  return (
    <LeaderboardView
      username={profile?.username}
      email={user?.email}
      rows={top.map((r) => {
        const s = statsByUser.get(r.id);
        return {
          id: r.id,
          username: r.username,
          totalPoints: r.total_points,
          exactScores: s?.exactScores ?? 0,
          correctWinners: s?.correctWinners ?? 0,
          predictionsCount: s?.predictionsCount ?? 0,
        };
      })}
      currentUserId={user?.id}
      myRank={myRank >= 0 ? myRank : undefined}
      myPoints={myRank >= 0 ? top[myRank].total_points : undefined}
    />
  );
}
