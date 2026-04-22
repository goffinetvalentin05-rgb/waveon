import { render } from "@react-email/render";
import { getResend, getResendApiKey, EMAIL_FROM, EMAIL_REPLY_TO_FALLBACK } from "@/lib/resend";
import { createAdminSupabaseClient, getSupabaseServiceRoleKey } from "@/lib/supabase/admin";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { formatPrice, normalizeBusinessCurrency } from "@/lib/utils/formatPrice";
import ReservationReminder from "@/lib/emails/templates/ReservationReminder";
import ReservationPostService from "@/lib/emails/templates/ReservationPostService";
import { renderTemplateText, sanitizeUrl } from "@/lib/emails/configurable";
import { plainTextToParagraphs } from "@/lib/emails/email-body-utils";
import {
  insertEmailDeliveryLog,
  logResendDomainHint,
  type DeliveryEmailType,
} from "@/lib/emails/delivery-log";

type ResendSendResult = { data?: { id?: string } | null; error?: { message?: string } | null };

type EmailSettingType = "reminder_before" | "post_service";

type DbEmailSetting = {
  business_id: string;
  type: EmailSettingType;
  enabled: boolean;
  delay_hours: number;
  subject: string;
  body: string;
  custom_links: Record<string, unknown>;
};

type DbReservation = {
  id: string;
  business_id: string;
  client_name: string;
  client_id: string | null;
  service_id: string;
  start_at: string;
  duration_minutes: number | null;
  status: "confirmed" | "cancelled" | "pending";
  cancel_token: string | null;
};

type DbClient = { email: string | null; phone: string | null; full_name: string | null };
type DbService = { name: string; price: number; duration_minutes: number };
type DbBusiness = {
  business_name: string | null;
  public_display_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  currency: string | null;
  public_logo_url: string | null;
};

function formatBizAddress(b: DbBusiness | null): string {
  if (!b) return "";
  const line2 = [b.postal_code?.trim(), b.city?.trim()].filter(Boolean).join(" ");
  return [b.address?.trim(), line2].filter(Boolean).join(", ");
}

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

function buildVars(input: {
  businessName: string;
  clientName: string;
  serviceName: string;
  reservationDate: string;
  reservationTime: string;
  businessPhone: string;
  businessAddress: string;
  formattedServicePrice: string;
}) {
  return {
    business_name: input.businessName,
    client_name: input.clientName,
    service_name: input.serviceName,
    reservation_date: input.reservationDate,
    reservation_time: input.reservationTime,
    business_phone: input.businessPhone,
    business_address: input.businessAddress,
    service_price: input.formattedServicePrice,
  } as const;
}

async function ensureLogAndSend(args: {
  admin: ReturnType<typeof createAdminSupabaseClient>;
  reservationId: string;
  businessId: string;
  type: EmailSettingType;
  deliveryType: DeliveryEmailType;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  from: string;
}): Promise<{ sent: boolean; skipped: boolean }> {
  const { admin, reservationId, businessId, type, deliveryType, to, subject, html, replyTo, from } =
    args;
  const logBase = `[emails/cron] type=${deliveryType} to=${to}`;

  const { data: existing } = await admin
    .from("wavon_email_logs")
    .select("status")
    .eq("business_id", businessId)
    .eq("reservation_id", reservationId)
    .eq("type", type)
    .eq("recipient_email", to)
    .maybeSingle();

  if (existing?.status === "sent") return { sent: false, skipped: true };

  const { data: inserted, error: insErr } = await admin
    .from("wavon_email_logs")
    .upsert(
      {
        business_id: businessId,
        reservation_id: reservationId,
        type,
        recipient_email: to,
        status: "pending",
      },
      { onConflict: "business_id,reservation_id,type,recipient_email" }
    )
    .select("id")
    .single();

  if (insErr) {
    return { sent: false, skipped: true };
  }

  try {
    const resend = getResend();
    const raw = await resend.emails.send({
      from,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    const result = raw as ResendSendResult;
    const errMsg = result.error?.message ?? (result.error ? String(result.error) : null);

    if (errMsg) {
      console.error(`${logBase} — erreur Resend: ${errMsg}`);
      logResendDomainHint(errMsg);
      await admin
        .from("wavon_email_logs")
        .update({
          status: "error",
          error: errMsg,
        })
        .eq("id", (inserted as { id: string }).id);
      await insertEmailDeliveryLog(admin, {
        business_id: businessId,
        reservation_id: reservationId,
        email_type: deliveryType,
        recipient: to,
        status: "failed",
        error_message: errMsg,
      });
      return { sent: false, skipped: false };
    }

    console.log(`${logBase} — succès Resend id=${result.data?.id ?? "n/a"}`);
    await admin
      .from("wavon_email_logs")
      .update({
        status: "sent",
        provider_id: result.data?.id ?? null,
        sent_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", (inserted as { id: string }).id);
    await insertEmailDeliveryLog(admin, {
      business_id: businessId,
      reservation_id: reservationId,
      email_type: deliveryType,
      recipient: to,
      status: "sent",
      error_message: null,
    });
    return { sent: true, skipped: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`${logBase} — exception:`, msg);
    logResendDomainHint(msg);
    await admin
      .from("wavon_email_logs")
      .update({
        status: "error",
        error: msg,
      })
      .eq("id", (inserted as { id: string }).id);
    await insertEmailDeliveryLog(admin, {
      business_id: businessId,
      reservation_id: reservationId,
      email_type: deliveryType,
      recipient: to,
      status: "failed",
      error_message: msg,
    });
    return { sent: false, skipped: false };
  }
}

export async function runScheduledEmails(options?: { now?: Date; limitBusinesses?: number }) {
  if (!getResendApiKey()) return { ok: false as const, error: "RESEND_API_KEY manquante." };
  if (!getSupabaseServiceRoleKey()) return { ok: false as const, error: "SUPABASE_SERVICE_ROLE_KEY manquante." };

  const admin = createAdminSupabaseClient();
  const now = options?.now ?? new Date();
  const windowMs = 15 * 60 * 1000;

  const { data: bizRows, error: bErr } = await admin
    .from(WavonDbTable.businesses)
    .select("id")
    .order("created_at", { ascending: true })
    .limit(options?.limitBusinesses ?? 500);
  if (bErr) return { ok: false as const, error: bErr.message };

  let sentCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const b of bizRows ?? []) {
    const businessId = (b as { id: string }).id;

    const { data: settings } = await admin
      .from("wavon_email_settings")
      .select("business_id,type,enabled,delay_hours,subject,body,custom_links")
      .eq("business_id", businessId);

    const byType = new Map<EmailSettingType, DbEmailSetting>();
    for (const s of (settings ?? []) as DbEmailSetting[]) byType.set(s.type, s);

    const reminder = byType.get("reminder_before");
    const post = byType.get("post_service");

    // Nothing enabled
    if (!reminder?.enabled && !post?.enabled) continue;

    // Fetch business details once
    const { data: biz } = await admin
      .from(WavonDbTable.businesses)
      .select("business_name,public_display_name,email,phone,address,city,postal_code,currency,public_logo_url")
      .eq("id", businessId)
      .maybeSingle();
    const business = (biz as DbBusiness | null) ?? null;
    const displayName = business?.public_display_name?.trim() || business?.business_name || "Commerce";
    const businessCurrency = normalizeBusinessCurrency(business?.currency);
    const replyTo = business?.email ?? EMAIL_REPLY_TO_FALLBACK;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://waevon.com";
    const unsubscribeUrl = `${baseUrl}/confidentialite`;
    const merchantLogoUrl = business?.public_logo_url?.trim() || null;
    const businessAddressFull = formatBizAddress(business);

    async function hydrateReservation(resRow: DbReservation) {
      const [svcRes, clientRes] = await Promise.all([
        admin.from("wavon_services").select("name,price,duration_minutes").eq("id", resRow.service_id).maybeSingle(),
        resRow.client_id
          ? admin.from("wavon_clients").select("email,phone,full_name").eq("id", resRow.client_id).maybeSingle()
          : Promise.resolve({ data: null as DbClient | null, error: null }),
      ]);
      const svc = svcRes.data as DbService | null;
      const client = clientRes.data as DbClient | null;
      return { svc, client };
    }

    // Reminder before appointment
    if (reminder?.enabled) {
      const delayH = Math.max(0, Number(reminder.delay_hours) || 0);
      const startMin = new Date(now.getTime() + delayH * 3600 * 1000);
      const startMax = new Date(startMin.getTime() + windowMs);

      const { data: due } = await admin
        .from("wavon_reservations")
        .select(
          "id,business_id,client_name,client_id,service_id,start_at,duration_minutes,status,cancel_token"
        )
        .eq("business_id", businessId)
        .in("status", ["confirmed", "pending"])
        .gte("start_at", startMin.toISOString())
        .lt("start_at", startMax.toISOString())
        .limit(300);

      for (const r of (due ?? []) as DbReservation[]) {
        const { svc, client } = await hydrateReservation(r);
        const to = (client?.email ?? "").trim().toLowerCase();
        if (!to) {
          skippedCount++;
          continue;
        }

        const date = formatEmailDate(r.start_at);
        const time = formatEmailTime(r.start_at);
        const formattedServicePrice = formatPrice(Number(svc?.price ?? 0), businessCurrency);
        const vars = buildVars({
          businessName: displayName,
          clientName: r.client_name || client?.full_name || "Client",
          serviceName: svc?.name ?? "Prestation",
          reservationDate: date,
          reservationTime: time,
          businessPhone: business?.phone ?? "",
          businessAddress: businessAddressFull,
          formattedServicePrice,
        });

        const subject = renderTemplateText(reminder.subject || "", vars);
        const bodyParas = plainTextToParagraphs(renderTemplateText(reminder.body || "", vars));
        const cancelUrl =
          r.cancel_token
            ? `${baseUrl}/annuler?reservationId=${encodeURIComponent(r.id)}&businessId=${encodeURIComponent(businessId)}&token=${encodeURIComponent(r.cancel_token)}`
            : undefined;

        const html = await render(
          ReservationReminder({
            businessName: displayName,
            clientName: vars.client_name,
            serviceName: vars.service_name,
            date,
            time,
            durationMin: Number(r.duration_minutes ?? svc?.duration_minutes ?? 0),
            formattedPrice: formattedServicePrice,
            address: businessAddressFull || undefined,
            phone: business?.phone ?? undefined,
            cancelUrl,
            merchantLogoUrl,
            customBodyParagraphs: bodyParas,
            unsubscribeUrl,
            previewText: subject || `Rappel — ${vars.service_name} le ${date}`,
          })
        );

        const outcome = await ensureLogAndSend({
          admin,
          reservationId: r.id,
          businessId,
          type: "reminder_before",
          deliveryType: "rappel",
          to,
          subject: subject || `Rappel de votre rendez-vous chez ${displayName}`,
          html,
          replyTo,
          from: EMAIL_FROM,
        });

        sentCount += outcome.sent ? 1 : 0;
        skippedCount += outcome.skipped ? 1 : 0;
        errorCount += outcome.sent || outcome.skipped ? 0 : 1;
      }
    }

    // Post service after appointment
    if (post?.enabled) {
      const delayH = Math.max(0, Number(post.delay_hours) || 0);
      const startMax = new Date(now.getTime() - delayH * 3600 * 1000);
      const startMin = new Date(startMax.getTime() - windowMs);

      const { data: done } = await admin
        .from("wavon_reservations")
        .select(
          "id,business_id,client_name,client_id,service_id,start_at,duration_minutes,status,cancel_token"
        )
        .eq("business_id", businessId)
        .eq("status", "confirmed")
        .gte("start_at", startMin.toISOString())
        .lt("start_at", startMax.toISOString())
        .limit(300);

      for (const r of (done ?? []) as DbReservation[]) {
        const { svc, client } = await hydrateReservation(r);
        const to = (client?.email ?? "").trim().toLowerCase();
        if (!to) {
          skippedCount++;
          continue;
        }

        const date = formatEmailDate(r.start_at);
        const time = formatEmailTime(r.start_at);
        const formattedServicePricePost = formatPrice(Number(svc?.price ?? 0), businessCurrency);
        const vars = buildVars({
          businessName: displayName,
          clientName: r.client_name || client?.full_name || "Client",
          serviceName: svc?.name ?? "Prestation",
          reservationDate: date,
          reservationTime: time,
          businessPhone: business?.phone ?? "",
          businessAddress: businessAddressFull,
          formattedServicePrice: formattedServicePricePost,
        });

        const subject = renderTemplateText(post.subject || "", vars);
        const bodyParas = plainTextToParagraphs(renderTemplateText(post.body || "", vars));

        const links = post.custom_links ?? {};
        const buttons: Array<{ label: string; href: string }> = [];
        const google = sanitizeUrl(typeof links.google_review === "string" ? links.google_review : "");
        const insta = sanitizeUrl(typeof links.instagram === "string" ? links.instagram : "");
        const tiktok = sanitizeUrl(typeof links.tiktok === "string" ? links.tiktok : "");
        const website = sanitizeUrl(typeof links.website === "string" ? links.website : "");
        const otherUrl = sanitizeUrl(typeof links.other_url === "string" ? links.other_url : "");
        const otherLabel = String(links.other_label ?? "").trim();

        if (google) buttons.push({ label: "Laisser un avis Google", href: google });
        if (insta) buttons.push({ label: "Nous suivre sur Instagram", href: insta });
        if (tiktok) buttons.push({ label: "Nous suivre sur TikTok", href: tiktok });
        if (website) buttons.push({ label: "Visiter notre site", href: website });
        if (otherUrl) buttons.push({ label: otherLabel || "Autre lien", href: otherUrl });

        const html = await render(
          ReservationPostService({
            businessName: displayName,
            clientName: vars.client_name,
            merchantLogoUrl,
            customBodyParagraphs: bodyParas,
            buttons,
            unsubscribeUrl,
            previewText: subject || `Merci — ${displayName}`,
          })
        );

        const outcome = await ensureLogAndSend({
          admin,
          reservationId: r.id,
          businessId,
          type: "post_service",
          deliveryType: "post_prestation",
          to,
          subject: subject || `Merci pour votre visite chez ${displayName}`,
          html,
          replyTo,
          from: EMAIL_FROM,
        });

        sentCount += outcome.sent ? 1 : 0;
        skippedCount += outcome.skipped ? 1 : 0;
        errorCount += outcome.sent || outcome.skipped ? 0 : 1;
      }
    }
  }

  return { ok: true as const, sentCount, skippedCount, errorCount };
}

