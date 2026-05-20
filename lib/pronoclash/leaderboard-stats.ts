export type GlobalLeaderboardStats = {
  exactScores: number;
  correctWinners: number;
  predictionsCount: number;
};

export function aggregateGlobalStats(
  rows: {
    user_id: string;
    exact_score: boolean;
    correct_winner: boolean;
  }[]
): Map<string, GlobalLeaderboardStats> {
  const map = new Map<string, GlobalLeaderboardStats>();
  for (const r of rows) {
    const cur = map.get(r.user_id) ?? {
      exactScores: 0,
      correctWinners: 0,
      predictionsCount: 0,
    };
    cur.predictionsCount += 1;
    if (r.exact_score) cur.exactScores += 1;
    if (r.correct_winner) cur.correctWinners += 1;
    map.set(r.user_id, cur);
  }
  return map;
}
