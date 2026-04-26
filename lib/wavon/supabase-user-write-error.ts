import type { PostgrestError } from "@supabase/supabase-js";

import { WAEVON_TRIAL_ENDED_MESSAGE } from "@/lib/wavon/premium-access";

const NO_BUSINESS_MESSAGE =
  "Ton compte n'est pas lié à un espace business. Reconnecte-toi ou contacte le support.";

const GENERIC_WRITE_MESSAGE =
  "Impossible d'enregistrer. Vérifie ta connexion ou tes droits d'accès.";

/**
 * Message utilisateur à partir d'une erreur Supabase (client ou serveur) sur insert/update/delete.
 */
export function userMessageForSupabaseWriteError(err: PostgrestError | null | undefined): string {
  if (!err) return GENERIC_WRITE_MESSAGE;
  const msg = (err.message ?? "").toLowerCase();
  const code = err.code ?? "";
  if (code === "PGRST116" || msg.includes("0 rows")) {
    return GENERIC_WRITE_MESSAGE;
  }
  if (
    code === "42501" ||
    msg.includes("row-level security") ||
    msg.includes("violates row-level security") ||
    (msg.includes("permission denied") && msg.includes("table"))
  ) {
    return `Impossible d'enregistrer. ${WAEVON_TRIAL_ENDED_MESSAGE} Vérifie aussi ta connexion.`;
  }
  if (msg.includes("null value in column") || msg.includes("violates not-null") || code === "23502") {
    return "Donnée obligatoire manquante. Réessaie ou contacte le support.";
  }
  if (code === "23505" || msg.includes("duplicate key")) {
    return "Cette ressource existe déjà (doublon).";
  }
  if (msg.includes("foreign key") || code === "23503") {
    return NO_BUSINESS_MESSAGE;
  }
  return err.message?.trim() ? err.message : GENERIC_WRITE_MESSAGE;
}
