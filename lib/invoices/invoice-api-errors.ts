import type { PostgrestError } from "@supabase/supabase-js";

/** Erreur PostgreSQL/PostgREST ou messagerie contenant le code INVOICE_* retourné par le RPC. */
export function userMessageForInvoiceRpcError(
  err: PostgrestError,
  supabaseForLog: unknown
): { status: number; code: string; userMessage: string; logMessage: string } {
  const raw = [err.message, (err as { details?: string }).details, (err as { hint?: string }).hint]
    .filter(Boolean)
    .join(" | ");
  const logMessage = `Supabase: ${err.code ?? "?"} ${raw} ${JSON.stringify(supabaseForLog)}`;

  const blob = (raw + " " + (err.message ?? "")).toUpperCase();
  if (blob.includes("INVOICE_NO_PRICE")) {
    return { status: 400, code: "no_price", userMessage: "Aucun prix n’est défini pour cette prestation.", logMessage };
  }
  if (blob.includes("INVOICE_NO_CLIENT")) {
    return { status: 400, code: "no_client", userMessage: "Ce rendez-vous n’est pas lié à un client.", logMessage };
  }
  if (blob.includes("INVOICE_NO_SERVICE") || blob.includes("INVOICE_RESERVATION_NOT_FOUND")) {
    return { status: 404, code: "not_found", userMessage: "Réservation ou service introuvable.", logMessage };
  }
  if (blob.includes("INVOICE_NOT_ALLOWED")) {
    return {
      status: 403,
      code: "feature_locked",
      userMessage: "La facturation est disponible uniquement avec le plan Pro.",
      logMessage,
    };
  }
  if (blob.includes("UNIQUE") && blob.includes("INVOICE")) {
    return { status: 409, code: "existing", userMessage: "Une facture existe déjà pour ce rendez-vous.", logMessage };
  }
  return { status: 500, code: "server", userMessage: "Erreur lors de la création de la facture.", logMessage };
}
