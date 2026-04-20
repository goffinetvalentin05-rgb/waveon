import { render } from "@react-email/render";
import { getResend, EMAIL_FROM, EMAIL_REPLY_TO_FALLBACK } from "@/lib/resend";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPriceCHF } from "@/lib/wavon/format";
import ConfirmationClient from "./templates/confirmation-client";
import NotificationMerchant from "./templates/notification-merchant";
import CancellationClient from "./templates/cancellation-client";
import CancellationMerchant from "./templates/cancellation-merchant";

// ─── Formatage des dates pour les emails ────────────────────────────────────

function formatEmailDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatEmailTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    .replace(":", "h");
}

// ─── Fetch des données de réservation ───────────────────────────────────────

type ReservationData = {
  id: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  serviceName: string;
  servicePrice: number;
  durationMin: number;
  startAt: string;
  status: string;
  cancelToken: string | null;
  businessName: string;
  businessDisplayName: string | null;
  merchantEmail: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
};

type DbReservationRow = {
  id: string;
  client_id: string | null;
  client_name: string | null;
  service_id: string;
  start_at: string;
  duration_minutes: number | null;
  status: "confirmed" | "cancelled" | "pending" | string;
  cancel_token: string | null;
};

type DbServiceRow = {
  name: string | null;
  price: number | null;
  duration_minutes: number | null;
};

type DbBusinessRow = {
  business_name: string | null;
  public_display_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type DbClientRow = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

async function fetchReservationData(
  reservationId: string,
  businessId: string
): Promise<ReservationData | null> {
  const supabase = createServerSupabaseClient();

  const { data: res, error: resErr } = await supabase
    .from("wavon_reservations")
    .select("id,client_id,client_name,service_id,start_at,duration_minutes,status,cancel_token")
    .eq("id", reservationId)
    .eq("business_id", businessId)
    .maybeSingle();

  const reservation = res as DbReservationRow | null;

  if (resErr || !reservation) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[emails] reservation not found:", resErr?.message);
    }
    return null;
  }

  const [svcRes, bizRes, clientRes] = await Promise.all([
    supabase
      .from("wavon_services")
      .select("name,price,duration_minutes")
      .eq("id", reservation.service_id)
      .maybeSingle(),
    supabase
      .from("wavon_businesses")
      .select("business_name,public_display_name,email,phone,address")
      .eq("id", businessId)
      .maybeSingle(),
    reservation.client_id
      ? supabase
          .from("wavon_clients")
          .select("email,phone,full_name")
          .eq("id", reservation.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (svcRes.error || bizRes.error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[emails] data fetch error:", svcRes.error?.message, bizRes.error?.message);
    }
    return null;
  }

  const svc = (svcRes.data as DbServiceRow | null) ?? null;
  const biz = (bizRes.data as DbBusinessRow | null) ?? null;
  const client = (clientRes.data as DbClientRow | null) ?? null;

  return {
    id: reservation.id,
    clientName: reservation.client_name || client?.full_name || "Client",
    clientEmail: client?.email ?? null,
    clientPhone: client?.phone ?? null,
    serviceName: svc?.name ?? "Prestation",
    servicePrice: svc?.price ?? 0,
    durationMin: reservation.duration_minutes ?? svc?.duration_minutes ?? 0,
    startAt: reservation.start_at,
    status: reservation.status,
    cancelToken: reservation.cancel_token ?? null,
    businessName: biz?.business_name ?? "Commerce",
    businessDisplayName: biz?.public_display_name ?? null,
    merchantEmail: biz?.email ?? null,
    businessPhone: biz?.phone ?? null,
    businessAddress: biz?.address ?? null,
  };
}

function getFromAddress(businessName: string): string {
  // Affiche le nom du commerce comme expéditeur, domaine Waevon
  const safe = businessName.replace(/[<>]/g, "").trim() || "Waevon";
  return `${safe} <${process.env.EMAIL_FROM_ADDRESS ?? "noreply@waevon.com"}>`;
}

// ─── Email 1+2 : Nouvelle réservation ───────────────────────────────────────

export async function sendNewBookingEmails(
  reservationId: string,
  businessId: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[emails] RESEND_API_KEY manquante — email ignoré.");
    }
    return;
  }

  try {
    const resend = getResend();
    const data = await fetchReservationData(reservationId, businessId);
    if (!data) return;

    const displayName = data.businessDisplayName?.trim() || data.businessName;
    const date = formatEmailDate(data.startAt);
    const time = formatEmailTime(data.startAt);
    const priceCHF = formatPriceCHF(data.servicePrice);
    const isPending = data.status === "pending";
    const replyTo = data.merchantEmail ?? EMAIL_REPLY_TO_FALLBACK;
    const from = getFromAddress(displayName);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://waevon.com";
    const cancelUrl =
      data.cancelToken
        ? `${baseUrl}/annuler?reservationId=${encodeURIComponent(reservationId)}&businessId=${encodeURIComponent(businessId)}&token=${encodeURIComponent(data.cancelToken)}`
        : null;

    const sends: Promise<unknown>[] = [];

    // Email au client (seulement si email fourni)
    if (data.clientEmail) {
      const html = await render(
        ConfirmationClient({
          businessName: displayName,
          clientName: data.clientName,
          serviceName: data.serviceName,
          date,
          time,
          durationMin: data.durationMin,
          priceCHF,
          address: data.businessAddress ?? undefined,
          phone: data.businessPhone ?? undefined,
          isPending,
          cancelUrl: cancelUrl ?? undefined,
        })
      );
      sends.push(
        resend.emails.send({
          from,
          to: data.clientEmail,
          replyTo,
          subject: isPending
            ? `Votre demande chez ${displayName} est bien enregistrée`
            : `Votre réservation chez ${displayName} est confirmée`,
          html,
        })
      );
    }

    // Email au commerçant
    if (data.merchantEmail) {
      const html = await render(
        NotificationMerchant({
          businessName: displayName,
          clientName: data.clientName,
          clientEmail: data.clientEmail ?? undefined,
          clientPhone: data.clientPhone ?? undefined,
          serviceName: data.serviceName,
          date,
          time,
          durationMin: data.durationMin,
          dashboardUrl: `${baseUrl}/dashboard/reservations`,
          isPending,
        })
      );
      sends.push(
        resend.emails.send({
          from: EMAIL_FROM,
          to: data.merchantEmail,
          subject: isPending
            ? `Nouvelle demande à confirmer — ${data.clientName}`
            : `Nouvelle réservation de ${data.clientName} le ${date}`,
          html,
        })
      );
    }

    await Promise.allSettled(sends);
  } catch (err) {
    console.error("[emails] sendNewBookingEmails error:", err);
  }
}

// ─── Email 3 : Annulation par le commerçant → client ────────────────────────

export async function sendCancellationByMerchantEmails(
  reservationId: string,
  businessId: string,
  reason?: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[emails] RESEND_API_KEY manquante — email ignoré.");
    }
    return;
  }

  try {
    const resend = getResend();
    const data = await fetchReservationData(reservationId, businessId);
    if (!data) return;

    const displayName = data.businessDisplayName?.trim() || data.businessName;
    const date = formatEmailDate(data.startAt);
    const time = formatEmailTime(data.startAt);
    const from = getFromAddress(displayName);
    const replyTo = data.merchantEmail ?? EMAIL_REPLY_TO_FALLBACK;

    const sends: Promise<unknown>[] = [];

    // Client
    if (data.clientEmail) {
      const html = await render(
        CancellationClient({
          businessName: displayName,
          clientName: data.clientName,
          serviceName: data.serviceName,
          date,
          time,
          phone: data.businessPhone ?? undefined,
          reason,
        })
      );
      sends.push(
        resend.emails.send({
          from,
          to: data.clientEmail,
          replyTo,
          subject: `Votre réservation chez ${displayName} a été annulée`,
          html,
        })
      );
    }

    // Merchant
    if (data.merchantEmail) {
      const html = await render(
        CancellationMerchant({
          businessName: displayName,
          clientName: data.clientName,
          clientPhone: data.clientPhone ?? undefined,
          serviceName: data.serviceName,
          date,
          time,
        })
      );
      sends.push(
        resend.emails.send({
          from: EMAIL_FROM,
          to: data.merchantEmail,
          subject: `Annulation de réservation — ${data.clientName}`,
          html,
        })
      );
    }

    await Promise.allSettled(sends);
  } catch (err) {
    console.error("[emails] sendCancellationByMerchantEmails error:", err);
  }
}

// ─── Email 3b : Annulation par le client → commerçant (future) ─────────────

export async function sendCancellationByClientEmails(
  reservationId: string,
  businessId: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  try {
    const resend = getResend();
    const data = await fetchReservationData(reservationId, businessId);
    if (!data) return;

    const displayName = data.businessDisplayName?.trim() || data.businessName;
    const date = formatEmailDate(data.startAt);
    const time = formatEmailTime(data.startAt);

    const sends: Promise<unknown>[] = [];

    // Merchant
    if (data.merchantEmail) {
      const html = await render(
        CancellationMerchant({
          businessName: displayName,
          clientName: data.clientName,
          clientPhone: data.clientPhone ?? undefined,
          serviceName: data.serviceName,
          date,
          time,
        })
      );
      sends.push(
        resend.emails.send({
          from: EMAIL_FROM,
          to: data.merchantEmail,
          subject: `Annulation de réservation — ${data.clientName}`,
          html,
        })
      );
    }

    // Client (si email connu)
    if (data.clientEmail) {
      const html = await render(
        CancellationClient({
          businessName: displayName,
          clientName: data.clientName,
          serviceName: data.serviceName,
          date,
          time,
          phone: data.businessPhone ?? undefined,
        })
      );
      const replyTo = data.merchantEmail ?? EMAIL_REPLY_TO_FALLBACK;
      const from = getFromAddress(displayName);
      sends.push(
        resend.emails.send({
          from,
          to: data.clientEmail,
          replyTo,
          subject: `Votre réservation chez ${displayName} a été annulée`,
          html,
        })
      );
    }

    await Promise.allSettled(sends);
  } catch (err) {
    console.error("[emails] sendCancellationByClientEmails error:", err);
  }
}
