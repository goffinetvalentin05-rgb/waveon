import { render } from "@react-email/render";
import { getResend, EMAIL_FROM, EMAIL_REPLY_TO_FALLBACK } from "@/lib/resend";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatPriceCHF } from "@/lib/wavon/format";
import ReminderClient from "@/lib/emails/templates/reminder-client";
import PostServiceClient from "@/lib/emails/templates/post-service-client";
import { renderTemplateText, sanitizeUrl, splitLines } from "@/lib/emails/configurable";

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
};

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
  priceCHF: string;
}) {
  return {
    business_name: input.businessName,
    client_name: input.clientName,
    service_name: input.serviceName,
    reservation_date: input.reservationDate,
    reservation_time: input.reservationTime,
    business_phone: input.businessPhone,
    business_address: input.businessAddress,
    service_price: input.priceCHF,
  } as const;
}

async function ensureLogAndSend(args: {
  admin: ReturnType<typeof createAdminSupabaseClient>;
  reservationId: string;
  businessId: string;
  type: EmailSettingType;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  from: string;
}): Promise<{ sent: boolean; skipped: boolean }> {
  const { admin, reservationId, businessId, type, to, subject, html, replyTo, from } = args;

  // Avoid duplicates via unique constraint + status check
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
    // Best-effort: if log insertion fails, avoid sending to prevent duplicates
    return { sent: false, skipped: true };
  }

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });

    await admin
      .from("wavon_email_logs")
      .update({
        status: "sent",
        provider_id: result.data?.id ?? null,
        sent_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", (inserted as { id: string }).id);

    return { sent: true, skipped: false };
  } catch (e) {
    await admin
      .from("wavon_email_logs")
      .update({
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      })
      .eq("id", (inserted as { id: string }).id);
    return { sent: false, skipped: false };
  }
}

export async function runScheduledEmails(options?: { now?: Date; limitBusinesses?: number }) {
  if (!process.env.RESEND_API_KEY) return { ok: false as const, error: "RESEND_API_KEY manquante." };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false as const, error: "SUPABASE_SERVICE_ROLE_KEY manquante." };

  const admin = createAdminSupabaseClient();
  const now = options?.now ?? new Date();
  const windowMs = 15 * 60 * 1000;

  const { data: bizRows, error: bErr } = await admin
    .from("wavon_businesses")
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
      .from("wavon_businesses")
      .select("business_name,public_display_name,email,phone,address")
      .eq("id", businessId)
      .maybeSingle();
    const business = (biz as DbBusiness | null) ?? null;
    const displayName = business?.public_display_name?.trim() || business?.business_name || "Commerce";
    const replyTo = business?.email ?? EMAIL_REPLY_TO_FALLBACK;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://waevon.com";

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
        .select("id,business_id,client_name,client_id,service_id,start_at,status,cancel_token")
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
        const priceCHF = formatPriceCHF(Number(svc?.price ?? 0));
        const vars = buildVars({
          businessName: displayName,
          clientName: r.client_name || client?.full_name || "Client",
          serviceName: svc?.name ?? "Prestation",
          reservationDate: date,
          reservationTime: time,
          businessPhone: business?.phone ?? "",
          businessAddress: business?.address ?? "",
          priceCHF,
        });

        const subject = renderTemplateText(reminder.subject || "", vars);
        const bodyText = renderTemplateText(reminder.body || "", vars);
        const cancelUrl =
          r.cancel_token
            ? `${baseUrl}/annuler?reservationId=${encodeURIComponent(r.id)}&businessId=${encodeURIComponent(businessId)}&token=${encodeURIComponent(r.cancel_token)}`
            : undefined;

        const html = await render(
          ReminderClient({
            businessName: displayName,
            previewText: subject || `Rappel — ${vars.service_name} le ${date}`,
            title: "Rappel de rendez-vous",
            greeting: `Bonjour ${vars.client_name},`,
            lines: splitLines(bodyText),
            address: business?.address ?? undefined,
            phone: business?.phone ?? undefined,
            cancelUrl,
          })
        );

        const outcome = await ensureLogAndSend({
          admin,
          reservationId: r.id,
          businessId,
          type: "reminder_before",
          to,
          subject: subject || `Rappel de votre rendez-vous chez ${displayName}`,
          html,
          replyTo,
          from: `${displayName} <${process.env.EMAIL_FROM_ADDRESS ?? "noreply@waevon.com"}>`,
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
        .select("id,business_id,client_name,client_id,service_id,start_at,status,cancel_token")
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
        const priceCHF = formatPriceCHF(Number(svc?.price ?? 0));
        const vars = buildVars({
          businessName: displayName,
          clientName: r.client_name || client?.full_name || "Client",
          serviceName: svc?.name ?? "Prestation",
          reservationDate: date,
          reservationTime: time,
          businessPhone: business?.phone ?? "",
          businessAddress: business?.address ?? "",
          priceCHF,
        });

        const subject = renderTemplateText(post.subject || "", vars);
        const bodyText = renderTemplateText(post.body || "", vars);

        const links = post.custom_links ?? {};
        const buttons: Array<{ label: string; href: string }> = [];
        const google = sanitizeUrl(typeof links.google_review === "string" ? links.google_review : "");
        const insta = sanitizeUrl(typeof links.instagram === "string" ? links.instagram : "");
        const tiktok = sanitizeUrl(typeof links.tiktok === "string" ? links.tiktok : "");
        const website = sanitizeUrl(typeof links.website === "string" ? links.website : "");
        const otherUrl = sanitizeUrl(typeof links.other_url === "string" ? links.other_url : "");
        const otherLabel = String(links.other_label ?? "").trim();

        if (google) buttons.push({ label: "Laisser un avis Google", href: google });
        if (insta) buttons.push({ label: "Suivre sur Instagram", href: insta });
        if (tiktok) buttons.push({ label: "Suivre sur TikTok", href: tiktok });
        if (website) buttons.push({ label: "Visiter le site", href: website });
        if (otherUrl) buttons.push({ label: otherLabel || "Ouvrir le lien", href: otherUrl });

        const html = await render(
          PostServiceClient({
            businessName: displayName,
            previewText: subject || `Merci — ${displayName}`,
            title: "Merci pour votre visite",
            greeting: `Bonjour ${vars.client_name},`,
            lines: splitLines(bodyText),
            buttons,
          })
        );

        const outcome = await ensureLogAndSend({
          admin,
          reservationId: r.id,
          businessId,
          type: "post_service",
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

