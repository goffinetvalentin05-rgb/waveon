import { render } from "@react-email/render";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getResend, getResendApiKey, EMAIL_FROM, EMAIL_REPLY_TO_FALLBACK } from "@/lib/resend";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatPriceEUR } from "@/lib/wavon/format";
import type { EmailTemplateType } from "@/lib/wavon/types";
import { renderTemplateText, splitLines } from "@/lib/emails/configurable";
import { defaultEmailBody, defaultEmailSubject } from "@/lib/emails/default-copy";
import {
  insertEmailDeliveryLog,
  logResendDomainHint,
  type DeliveryEmailType,
} from "@/lib/emails/delivery-log";
import ConfirmationClient from "./templates/confirmation-client";
import NotificationMerchant from "./templates/notification-merchant";
import CancellationClient from "./templates/cancellation-client";
import CancellationMerchant from "./templates/cancellation-merchant";
import ReminderClient from "./templates/reminder-client";

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
  businessAddress: string;
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
  city: string | null;
  postal_code: string | null;
};

type DbClientRow = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

function formatBusinessAddress(biz: DbBusinessRow | null): string {
  if (!biz) return "";
  const line2 = [biz.postal_code?.trim(), biz.city?.trim()].filter(Boolean).join(" ");
  return [biz.address?.trim(), line2].filter(Boolean).join(", ");
}

async function fetchReservationData(
  admin: SupabaseClient,
  reservationId: string,
  businessId: string
): Promise<ReservationData | null> {
  const { data: res, error: resErr } = await admin
    .from("wavon_reservations")
    .select("id,client_id,client_name,service_id,start_at,duration_minutes,status,cancel_token")
    .eq("id", reservationId)
    .eq("business_id", businessId)
    .maybeSingle();

  const reservation = res as DbReservationRow | null;

  if (resErr || !reservation) {
    console.error("[emails] reservation not found:", resErr?.message);
    return null;
  }

  const [svcRes, bizRes, clientRes] = await Promise.all([
    admin
      .from("wavon_services")
      .select("name,price,duration_minutes")
      .eq("id", reservation.service_id)
      .maybeSingle(),
    admin
      .from("wavon_businesses")
      .select("business_name,public_display_name,email,phone,address,city,postal_code")
      .eq("id", businessId)
      .maybeSingle(),
    reservation.client_id
      ? admin
          .from("wavon_clients")
          .select("email,phone,full_name")
          .eq("id", reservation.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (svcRes.error || bizRes.error) {
    console.error("[emails] data fetch error:", svcRes.error?.message, bizRes.error?.message);
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
    businessAddress: formatBusinessAddress(biz),
  };
}

function buildTemplateVars(data: ReservationData, displayName: string) {
  const date = formatEmailDate(data.startAt);
  const time = formatEmailTime(data.startAt);
  const price = formatPriceEUR(data.servicePrice);
  return {
    client_name: data.clientName,
    service_name: data.serviceName,
    reservation_date: date,
    reservation_time: time,
    business_name: displayName,
    business_phone: data.businessPhone ?? "",
    business_address: data.businessAddress,
    service_price: price,
  };
}

async function fetchEmailTemplate(
  admin: SupabaseClient,
  businessId: string,
  type: EmailTemplateType
): Promise<{ is_enabled: boolean; subject: string; body: string } | null> {
  const { data, error } = await admin
    .from("wavon_email_templates")
    .select("is_enabled,subject,body")
    .eq("business_id", businessId)
    .eq("type", type)
    .maybeSingle();
  if (error) {
    console.error("[emails] template fetch error:", error.message);
    return null;
  }
  return data as { is_enabled: boolean; subject: string; body: string } | null;
}

type ResendSendResult = { data?: { id?: string } | null; error?: { message?: string } | null };

async function sendResendAndLog(args: {
  admin: SupabaseClient;
  businessId: string;
  reservationId: string | null;
  emailType: DeliveryEmailType;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  const { admin, businessId, reservationId, emailType, to, subject, html, replyTo } = args;
  const logBase = `[emails] type=${emailType} to=${to}`;

  if (!getResendApiKey()) {
    console.warn(`${logBase} — RESEND_API_KEY manquante, envoi ignoré.`);
    await insertEmailDeliveryLog(admin, {
      business_id: businessId,
      reservation_id: reservationId,
      email_type: emailType,
      recipient: to,
      status: "failed",
      error_message: "RESEND_API_KEY manquante",
    });
    return;
  }

  try {
    const resend = getResend();
    const raw = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      ...(replyTo ? { replyTo } : {}),
      subject,
      html,
    });
    const result = raw as ResendSendResult;
    const errMsg = result.error?.message ?? (result.error ? String(result.error) : null);

    if (errMsg) {
      console.error(`${logBase} — erreur Resend: ${errMsg}`);
      logResendDomainHint(errMsg);
      await insertEmailDeliveryLog(admin, {
        business_id: businessId,
        reservation_id: reservationId,
        email_type: emailType,
        recipient: to,
        status: "failed",
        error_message: errMsg,
      });
      return;
    }

    console.log(`${logBase} — succès Resend id=${result.data?.id ?? "n/a"}`);
    await insertEmailDeliveryLog(admin, {
      business_id: businessId,
      reservation_id: reservationId,
      email_type: emailType,
      recipient: to,
      status: "sent",
      error_message: null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`${logBase} — exception:`, msg);
    logResendDomainHint(msg);
    await insertEmailDeliveryLog(admin, {
      business_id: businessId,
      reservation_id: reservationId,
      email_type: emailType,
      recipient: to,
      status: "failed",
      error_message: msg,
    });
  }
}

export async function sendNewBookingEmails(
  reservationId: string,
  businessId: string
): Promise<void> {
  let admin: SupabaseClient;
  try {
    admin = createAdminSupabaseClient();
  } catch (e) {
    console.error("[emails] admin client:", e);
    return;
  }

  try {
    const data = await fetchReservationData(admin, reservationId, businessId);
    if (!data) return;

    const displayName = data.businessDisplayName?.trim() || data.businessName;
    const date = formatEmailDate(data.startAt);
    const time = formatEmailTime(data.startAt);
    const priceEUR = formatPriceEUR(data.servicePrice);
    const isPending = data.status === "pending";
    const replyTo = data.merchantEmail ?? EMAIL_REPLY_TO_FALLBACK;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://waevon.com";
    const cancelUrl =
      data.cancelToken
        ? `${baseUrl}/annuler?reservationId=${encodeURIComponent(reservationId)}&businessId=${encodeURIComponent(businessId)}&token=${encodeURIComponent(data.cancelToken)}`
        : null;

    const tpl = await fetchEmailTemplate(admin, businessId, "confirmation");
    const vars = buildTemplateVars(data, displayName);
    const useTpl = tpl !== null && tpl.is_enabled !== false;

    if (data.clientEmail && useTpl) {
      const subjRaw =
        (tpl?.subject?.trim() ? tpl.subject : defaultEmailSubject("confirmation")) ||
        defaultEmailSubject("confirmation");
      const bodyRaw =
        (tpl?.body?.trim() ? tpl.body : defaultEmailBody("confirmation")) ||
        defaultEmailBody("confirmation");
      const subject = renderTemplateText(subjRaw, vars);
      const bodyRendered = renderTemplateText(bodyRaw, vars);
      const lines = splitLines(bodyRendered);
      const html = await render(
        ReminderClient({
          businessName: displayName,
          previewText: subject || `Message de ${displayName}`,
          title: isPending ? "Demande enregistrée" : "Réservation confirmée",
          greeting: `Bonjour ${data.clientName},`,
          lines,
          address: data.businessAddress || undefined,
          phone: data.businessPhone || undefined,
          cancelUrl: cancelUrl ?? undefined,
        })
      );
      await sendResendAndLog({
        admin,
        businessId,
        reservationId,
        emailType: "confirmation",
        to: data.clientEmail,
        subject:
          subject ||
          (isPending
            ? `Votre demande chez ${displayName} est bien enregistrée`
            : `Votre réservation chez ${displayName} est confirmée`),
        html,
        replyTo,
      });
    } else if (data.clientEmail && tpl?.is_enabled === false) {
      console.log(
        `[emails] confirmation désactivée par le commerçant — pas d'email client pour ${data.clientEmail}`
      );
    } else if (data.clientEmail) {
      const html = await render(
        ConfirmationClient({
          businessName: displayName,
          clientName: data.clientName,
          serviceName: data.serviceName,
          date,
          time,
          durationMin: data.durationMin,
          priceCHF: priceEUR,
          address: data.businessAddress || undefined,
          phone: data.businessPhone || undefined,
          isPending,
          cancelUrl: cancelUrl ?? undefined,
        })
      );
      await sendResendAndLog({
        admin,
        businessId,
        reservationId,
        emailType: "confirmation",
        to: data.clientEmail,
        subject: isPending
          ? `Votre demande chez ${displayName} est bien enregistrée`
          : `Votre réservation chez ${displayName} est confirmée`,
        html,
        replyTo,
      });
    }

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
          dashboardUrl: `${baseUrl}/dashboard/calendrier`,
          isPending,
        })
      );
      await sendResendAndLog({
        admin,
        businessId,
        reservationId,
        emailType: "confirmation",
        to: data.merchantEmail,
        subject: isPending
          ? `Nouvelle demande à confirmer — ${data.clientName}`
          : `Nouvelle réservation de ${data.clientName} le ${date}`,
        html,
      });
    }
  } catch (err) {
    console.error("[emails] sendNewBookingEmails error:", err);
  }
}

export async function sendCancellationByMerchantEmails(
  reservationId: string,
  businessId: string,
  reason?: string
): Promise<void> {
  let admin: SupabaseClient;
  try {
    admin = createAdminSupabaseClient();
  } catch (e) {
    console.error("[emails] admin client:", e);
    return;
  }

  try {
    const data = await fetchReservationData(admin, reservationId, businessId);
    if (!data) return;

    const displayName = data.businessDisplayName?.trim() || data.businessName;
    const date = formatEmailDate(data.startAt);
    const time = formatEmailTime(data.startAt);
    const replyTo = data.merchantEmail ?? EMAIL_REPLY_TO_FALLBACK;
    const tpl = await fetchEmailTemplate(admin, businessId, "cancellation");
    const vars = buildTemplateVars(data, displayName);
    const useTpl = tpl !== null && tpl.is_enabled !== false;

    if (data.clientEmail && useTpl) {
      const subjRaw =
        (tpl?.subject?.trim() ? tpl.subject : defaultEmailSubject("cancellation")) ||
        defaultEmailSubject("cancellation");
      const bodyRaw =
        (tpl?.body?.trim() ? tpl.body : defaultEmailBody("cancellation")) ||
        defaultEmailBody("cancellation");
      let bodyRendered = renderTemplateText(bodyRaw, vars);
      if (reason?.trim()) {
        bodyRendered += `\n\nMotif : ${reason.trim()}`;
      }
      const lines = splitLines(bodyRendered);
      const subject = renderTemplateText(subjRaw, vars);
      const html = await render(
        ReminderClient({
          businessName: displayName,
          previewText: subject || `Annulation — ${displayName}`,
          title: "Réservation annulée",
          greeting: `Bonjour ${data.clientName},`,
          lines,
          phone: data.businessPhone || undefined,
          address: data.businessAddress || undefined,
        })
      );
      await sendResendAndLog({
        admin,
        businessId,
        reservationId,
        emailType: "annulation",
        to: data.clientEmail,
        subject: subject || `Votre réservation chez ${displayName} a été annulée`,
        html,
        replyTo,
      });
    } else if (data.clientEmail && tpl?.is_enabled === false) {
      console.log(`[emails] annulation client désactivée — pas d'email pour ${data.clientEmail}`);
    } else if (data.clientEmail) {
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
      await sendResendAndLog({
        admin,
        businessId,
        reservationId,
        emailType: "annulation",
        to: data.clientEmail,
        subject: `Votre réservation chez ${displayName} a été annulée`,
        html,
        replyTo,
      });
    }

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
      await sendResendAndLog({
        admin,
        businessId,
        reservationId,
        emailType: "annulation",
        to: data.merchantEmail,
        subject: `Annulation de réservation — ${data.clientName}`,
        html,
      });
    }
  } catch (err) {
    console.error("[emails] sendCancellationByMerchantEmails error:", err);
  }
}

export async function sendCancellationByClientEmails(
  reservationId: string,
  businessId: string
): Promise<void> {
  let admin: SupabaseClient;
  try {
    admin = createAdminSupabaseClient();
  } catch (e) {
    console.error("[emails] admin client:", e);
    return;
  }

  try {
    const data = await fetchReservationData(admin, reservationId, businessId);
    if (!data) return;

    const displayName = data.businessDisplayName?.trim() || data.businessName;
    const date = formatEmailDate(data.startAt);
    const time = formatEmailTime(data.startAt);
    const replyTo = data.merchantEmail ?? EMAIL_REPLY_TO_FALLBACK;
    const tpl = await fetchEmailTemplate(admin, businessId, "cancellation");
    const vars = buildTemplateVars(data, displayName);
    const useTpl = tpl !== null && tpl.is_enabled !== false;

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
      await sendResendAndLog({
        admin,
        businessId,
        reservationId,
        emailType: "annulation",
        to: data.merchantEmail,
        subject: `Annulation de réservation — ${data.clientName}`,
        html,
      });
    }

    if (data.clientEmail && useTpl) {
      const subjRaw =
        (tpl?.subject?.trim() ? tpl.subject : defaultEmailSubject("cancellation")) ||
        defaultEmailSubject("cancellation");
      const bodyRaw =
        (tpl?.body?.trim() ? tpl.body : defaultEmailBody("cancellation")) ||
        defaultEmailBody("cancellation");
      const subject = renderTemplateText(subjRaw, vars);
      const lines = splitLines(renderTemplateText(bodyRaw, vars));
      const html = await render(
        ReminderClient({
          businessName: displayName,
          previewText: subject || `Annulation — ${displayName}`,
          title: "Réservation annulée",
          greeting: `Bonjour ${data.clientName},`,
          lines,
          phone: data.businessPhone || undefined,
          address: data.businessAddress || undefined,
        })
      );
      await sendResendAndLog({
        admin,
        businessId,
        reservationId,
        emailType: "annulation",
        to: data.clientEmail,
        subject: subject || `Votre réservation chez ${displayName} a été annulée`,
        html,
        replyTo,
      });
    } else if (data.clientEmail && tpl?.is_enabled === false) {
      console.log(`[emails] annulation client désactivée — pas d'email pour ${data.clientEmail}`);
    } else if (data.clientEmail) {
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
      await sendResendAndLog({
        admin,
        businessId,
        reservationId,
        emailType: "annulation",
        to: data.clientEmail,
        subject: `Votre réservation chez ${displayName} a été annulée`,
        html,
        replyTo,
      });
    }
  } catch (err) {
    console.error("[emails] sendCancellationByClientEmails error:", err);
  }
}
