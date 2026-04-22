import { WAEVON_TRIAL_DAYS } from "@/lib/stripe/config";

const MS_PER_DAY = 86_400_000;

export type TrialWindowRow = {
  trial_ends_at: string | null;
  created_at: string | null;
};

/** Fin d’essai Waevon : `trial_ends_at` ou repli `created_at + WAEVON_TRIAL_DAYS`. */
export function getEffectiveTrialEnd(row: TrialWindowRow): { endMs: number; iso: string } | null {
  if (row.trial_ends_at) {
    const endMs = new Date(row.trial_ends_at).getTime();
    if (Number.isFinite(endMs)) {
      return { endMs, iso: row.trial_ends_at };
    }
  }
  if (row.created_at) {
    const c = new Date(row.created_at).getTime();
    if (Number.isFinite(c)) {
      const endMs = c + WAEVON_TRIAL_DAYS * MS_PER_DAY;
      return { endMs, iso: new Date(endMs).toISOString() };
    }
  }
  return null;
}

export function isTrialWindowStillActive(row: TrialWindowRow): boolean {
  const e = getEffectiveTrialEnd(row);
  return e !== null && e.endMs > Date.now();
}
