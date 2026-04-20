import type { SupabaseClient } from "@supabase/supabase-js";

export type DeliveryEmailType = "confirmation" | "rappel" | "annulation" | "post_prestation";

export async function insertEmailDeliveryLog(
  admin: SupabaseClient,
  row: {
    business_id: string;
    reservation_id: string | null;
    email_type: DeliveryEmailType;
    recipient: string;
    status: "sent" | "failed";
    error_message: string | null;
  }
): Promise<void> {
  const { error } = await admin.from("wavon_email_delivery_logs").insert({
    business_id: row.business_id,
    reservation_id: row.reservation_id,
    email_type: row.email_type,
    recipient: row.recipient,
    status: row.status,
    error_message: row.error_message,
    sent_at: new Date().toISOString(),
  });
  if (error && process.env.NODE_ENV !== "production") {
    console.error("[emails] insertEmailDeliveryLog:", error.message);
  }
}

export function logResendDomainHint(message: string): void {
  if (/domain|verify|verified|not allowed|invalid from/i.test(message)) {
    console.error(
      "Domaine non vérifié dans Resend — vérifier le domaine waevon.com dans Resend Dashboard > Domains"
    );
  }
}
