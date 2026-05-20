/**
 * Moteur de scoring Prono Clash (MVP).
 *
 * Règles :
 *  - bon vainqueur : +3
 *  - bon match nul : +3
 *  - score exact : +5
 *  - bon écart de buts (en plus du bon vainqueur) : +1
 *  - joker x2 : double les points obtenus sur ce match
 *  - bus garé : si bon nul + carte jouée + match nul → +3 supplémentaires
 *  - hold-up : si bon vainqueur + écart de 1 but exactement → +3 supplémentaires
 *  - outsider : si bon vainqueur d'une équipe outsider → +5 supplémentaires
 *  - tacle glissé : si auteur fait plus que la cible sur ce match → vole 2 pts
 *    (géré séparément côté card-effects, pas ici)
 */

export type MatchOutcome = "home" | "away" | "draw";

export type PredictionInput = {
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_winner?: MatchOutcome | null;
};

export type MatchResult = {
  home_score: number;
  away_score: number;
  winner: MatchOutcome;
};

export function computeWinner(home: number, away: number): MatchOutcome {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

export type ScoringBonus = {
  bus_gare?: boolean;
  hold_up?: boolean;
  outsider_team?: "home" | "away" | null;
  joker_x2?: boolean;
};

/**
 * Calcule les points bruts d'un pronostic vs le résultat réel.
 * Renvoie une décomposition pour log (scoring_events).
 */
export type ScoringResult = {
  points: number;
  reasons: { reason: string; points: number }[];
  exact_score: boolean;
  correct_winner: boolean;
  correct_goal_difference: boolean;
};

export function scorePrediction(
  prediction: PredictionInput,
  result: MatchResult,
  bonuses: ScoringBonus = {}
): ScoringResult {
  const reasons: { reason: string; points: number }[] = [];
  const add = (reason: string, points: number) => {
    if (points !== 0) reasons.push({ reason, points });
  };

  const predictedWinner =
    prediction.predicted_winner ??
    computeWinner(prediction.predicted_home_score, prediction.predicted_away_score);

  const exactScore =
    prediction.predicted_home_score === result.home_score &&
    prediction.predicted_away_score === result.away_score;
  const correctWinner = predictedWinner === result.winner;

  let correctGoalDifference = false;

  if (exactScore) {
    add("score_exact", 5);
  } else if (correctWinner) {
    if (result.winner === "draw") {
      add("bon_nul", 3);
    } else {
      add("bon_vainqueur", 3);
      const realGap = Math.abs(result.home_score - result.away_score);
      const predGap = Math.abs(
        prediction.predicted_home_score - prediction.predicted_away_score
      );
      if (realGap === predGap) {
        correctGoalDifference = true;
        add("bon_ecart", 1);
      }
    }
  }

  // Score exact => par définition, correct_goal_difference est aussi vrai
  if (exactScore) correctGoalDifference = true;

  if (bonuses.bus_gare && result.winner === "draw" && predictedWinner === "draw") {
    add("bus_gare_bonus", 3);
  }
  if (
    bonuses.hold_up &&
    result.winner !== "draw" &&
    predictedWinner === result.winner &&
    Math.abs(result.home_score - result.away_score) === 1
  ) {
    add("hold_up_bonus", 3);
  }
  if (
    bonuses.outsider_team &&
    result.winner === bonuses.outsider_team &&
    predictedWinner === result.winner
  ) {
    add("outsider_bonus", 5);
  }

  let points = reasons.reduce((acc, r) => acc + r.points, 0);

  if (bonuses.joker_x2 && points > 0) {
    add("joker_x2", points);
    points *= 2;
  }

  return {
    points,
    reasons,
    exact_score: exactScore,
    correct_winner: correctWinner,
    correct_goal_difference: correctGoalDifference,
  };
}

export {
  isPredictionLocked,
  PREDICTION_LOCKED_MESSAGE,
} from "@/lib/pronoclash/prediction-lock";
