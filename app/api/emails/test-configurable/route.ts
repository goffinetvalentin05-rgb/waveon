import { NextResponse, type NextRequest } from "next/server";
import { render } from "@react-email/render";
import {
  getResend,
  getResendApiKey,
  resendApiKeyMissingUserMessage,
  resendRelatedEnvKeyNames,
  EMAIL_FROM,
} from "@/lib/resend";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import {
  createAdminSupabaseClient,
  getSupabaseServiceRoleKey,
  supabaseServiceRoleKeyMissingUserMessage,
  supabaseServiceRoleRelatedEnvKeyNames,
} from "@/lib/supabase/admin";
import { renderTemplateText, sanitizeUrl } from "@/lib/emails/configurable";
import { plainTextToParagraphs, templateBodyToParagraphs } from "@/lib/emails/email-body-utils";
import { defaultEmailBody, defaultEmailSubject } from "@/lib/emails/default-copy";
import type { EmailTemplateType } from "@/lib/wavon/types";
import { formatPrice, normalizeBusinessCurrency } from "@/lib/utils/formatPrice";
import { publicBookingAbsoluteUrl } from "@/lib/wavon/public-page-url";
import { merchantBillingGateResponse } from "@/lib/subscription/api-billing-guard";
import ReservationConfirmation from "@/lib/emails/templates/ReservationConfirmation";
import ReservationCancellation from "@/lib/emails/templates/ReservationCancellation";
import ReservationReminder from "@/lib/emails/templates/ReservationReminder";
import ReservationPostService from "@/lib/emails/templates/ReservationPostService";
import ReservationNotification from "@/lib/emails/templates/ReservationNotification";
import ReservationCancellationOwner from "@/lib/emails/templates/ReservationCancellationOwner";

type ScheduledKind = "reminder_before" | "post_service";

type Body = {
  businessId?: string;
  to?: string;
  mode?: "scheduled" | "template" | "merchant";
  scheduledType?: ScheduledKind;
  templateType?: EmailTemplateType;
  merchantKind?: "new_booking" | "cancellation";
};

type DbSetting = {
  type: ScheduledKind;
  enabled: boolean;
  delay_hours: number;
  subject: string;
  body: string;
  custom_links: Record<string, unknown>;
};

type DbBusiness = {
  business_name: string | null;
  public_display_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  email: string | null;
  currency: string | null;
  public_logo_url: string | null;
  public_slug: string | null;
};

function formatBizAddress(b: DbBusiness | null): string {
  if (!b) return "";
  const line2 = [b.postal_code?.trim(), b.city?.trim()].filter(Boolean).join(" ");
  return [b.address?.trim(), line2].filter(Boolean).join(", ");
}

export async function POST(req: NextRequest) {
  if (!getResendApiKey()) {
    return NextResponse.json(
      {
        ok: false,
        error: resendApiKeyMissingUserMessage(),
        resendEnvKeyNames: resendRelatedEnvKeyNames(),
      },
      { status: 503 }
    );
  }
  if (!getSupabaseServiceRoleKey()) {
    return NextResponse.json(
      {
        ok: false,
        error: supabaseServiceRoleKeyMissingUserMessage(),
        serviceRoleEnvKeyNames: supabaseServiceRoleRelatedEnvKeyNames(),
      },
      { status: 503 }
    );
  }

  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json(
        { ok: false, error: authErr?.message || "Non authentifié." },
        { status: 401 }
      );
    }

    const gate = await merchantBillingGateResponse();
    if (gate) return gate;

    const parsed = (await req.json().catch(() => null)) as Body | null;
    const businessId = String(parsed?.businessId ?? "").trim();
    const to = String(parsed?.to ?? "").trim();
    const mode = parsed?.mode ?? "scheduled";

    if (!businessId || !to) {
      return NextResponse.json({ ok: false, error: "businessId et to requis." }, { status: 400 });
    }

    const { data: bizRow, error: bizErr } = await supabase
      .from(WavonDbTable.businesses)
      .select("id,user_id")
      .eq("id", businessId)
      .maybeSingle();
    if (bizErr || !bizRow || (bizRow as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Accès refusé." }, { status: 403 });
    }

    const admin = createAdminSupabaseClient();
    const { data: biz } = await admin
      .from(WavonDbTable.businesses)
      .select(
        "business_name,public_display_name,phone,address,city,postal_code,email,currency,public_logo_url,public_slug"
      )
      .eq("id", businessId)
      .maybeSingle();
    const business = (biz as DbBusiness | null) ?? null;
    const displayName = business?.public_display_name?.trim() || business?.business_name || "Commerce";
    const testCurrency = normalizeBusinessCurrency(business?.currency);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://waevon.com";
    const merchantLogoUrl = business?.public_logo_url?.trim() || null;
    const rebookUrl = business?.public_slug?.trim()
      ? publicBookingAbsoluteUrl(business.public_slug)
      : baseUrl;
    const unsubscribeUrl = `${baseUrl}/confidentialite`;

    const vars = {
      business_name: displayName,
      client_name: "Client test",
      service_name: "Prestation test",
      reservation_date: "mardi 21 avril 2026",
      reservation_time: "14h30",
      business_phone: String(business?.phone ?? "022 000 00 00"),
      business_address: formatBizAddress(business) || "Adresse test 1, 1000 Lausanne",
      service_price: formatPrice(40, testCurrency),
    };

    let html: string;
    let subject: string;

    if (mode === "merchant") {
      const mk = parsed?.merchantKind === "cancellation" ? "cancellation" : "new_booking";
      if (mk === "new_booking") {
        subject = `[Test] Nouvelle réservation — ${vars.client_name}`;
        html = await render(
          ReservationNotification({
            clientName: vars.client_name,
            clientEmail: "client@example.com",
            clientPhone: "079 000 00 00",
            serviceName: vars.service_name,
            date: vars.reservation_date,
            time: vars.reservation_time,
            durationMin: 30,
            dashboardUrl: `${baseUrl}/dashboard/calendrier`,
            isPending: false,
          })
        );
      } else {
        subject = `[Test] Annulation commerçant — ${vars.client_name}`;
        html = await render(
          ReservationCancellationOwner({
            clientName: vars.client_name,
            clientEmail: "client@example.com",
            clientPhone: "079 000 00 00",
            serviceName: vars.service_name,
            date: vars.reservation_date,
            time: vars.reservation_time,
            durationMin: 30,
          })
        );
      }
    } else if (mode === "template") {
      const templateType = parsed?.templateType ?? "confirmation";
      if (templateType === "reminder") {
        return NextResponse.json({ ok: false, error: "Utilise le mode rappel planifié." }, { status: 400 });
      }
      const { data: tpl } = await admin
        .from(WavonDbTable.emailTemplates)
        .select("subject,body,is_enabled")
        .eq("business_id", businessId)
        .eq("type", templateType)
        .maybeSingle();
      const row = tpl as { subject: string; body: string; is_enabled: boolean } | null;
      const subjRaw =
        row?.subject?.trim() ||
        defaultEmailSubject(templateType as "confirmation" | "cancellation");
      const bodyRaw =
        row?.body?.trim() || defaultEmailBody(templateType as "confirmation" | "cancellation");
      subject = `[Test] ${renderTemplateText(subjRaw, vars)}`;
      if (templateType === "cancellation") {
        const customIntro = templateBodyToParagraphs(bodyRaw, vars);
        html = await render(
          ReservationCancellation({
            businessName: displayName,
            clientName: vars.client_name,
            serviceName: vars.service_name,
            date: vars.reservation_date,
            time: vars.reservation_time,
            durationMin: 30,
            formattedPrice: vars.service_price,
            rebookUrl,
            merchantLogoUrl,
            customIntroParagraphs: customIntro,
          })
        );
      } else {
        const customIntro = templateBodyToParagraphs(bodyRaw, vars);
        html = await render(
          ReservationConfirmation({
            businessName: displayName,
            clientName: vars.client_name,
            serviceName: vars.service_name,
            date: vars.reservation_date,
            time: vars.reservation_time,
            durationMin: 30,
            formattedPrice: vars.service_price,
            address: vars.business_address,
            phone: vars.business_phone,
            cancelUrl: `${baseUrl}/annuler?reservationId=demo&token=demo`,
            isPending: false,
            merchantLogoUrl,
            customIntroParagraphs: customIntro,
          })
        );
      }
    } else {
      const scheduledType: ScheduledKind =
        parsed?.scheduledType === "post_service" ? "post_service" : "reminder_before";
      const { data: s } = await admin
        .from(WavonDbTable.emailSettings)
        .select("type,enabled,delay_hours,subject,body,custom_links")
        .eq("business_id", businessId)
        .eq("type", scheduledType)
        .maybeSingle();
      if (!s) {
        return NextResponse.json({ ok: false, error: "Réglage introuvable." }, { status: 404 });
      }
      const setting = s as DbSetting;
      subject = `[Test] ${renderTemplateText(setting.subject || "", vars)}`;
      const bodyText = renderTemplateText(setting.body || "", vars);

      if (scheduledType === "post_service") {
        const links = setting.custom_links ?? {};
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
        if (buttons.length === 0) {
          buttons.push({ label: "Exemple — Waevon", href: "https://waevon.com" });
        }
        html = await render(
          ReservationPostService({
            businessName: displayName,
            clientName: vars.client_name,
            merchantLogoUrl,
            customBodyParagraphs: plainTextToParagraphs(bodyText),
            buttons,
            unsubscribeUrl,
            previewText: subject,
          })
        );
      } else {
        html = await render(
          ReservationReminder({
            businessName: displayName,
            clientName: vars.client_name,
            serviceName: vars.service_name,
            date: vars.reservation_date,
            time: vars.reservation_time,
            durationMin: 30,
            formattedPrice: vars.service_price,
            address: vars.business_address,
            phone: vars.business_phone,
            cancelUrl: `${baseUrl}/annuler?reservationId=demo&token=demo`,
            merchantLogoUrl,
            customBodyParagraphs: plainTextToParagraphs(bodyText),
            unsubscribeUrl,
            previewText: subject,
          })
        );
      }
    }

    try {
      const resend = getResend();
      const { error: resendErr } = await resend.emails.send({
        from: EMAIL_FROM,
        to,
        subject: subject || `[Test] Waevon`,
        html,
      });
      if (resendErr) {
        const msg =
          typeof resendErr === "object" && resendErr !== null && "message" in resendErr
            ? String((resendErr as { message: unknown }).message)
            : String(resendErr);
        console.error("[api/emails/test-configurable] Resend:", msg);
        return NextResponse.json({ ok: false, error: msg }, { status: 502 });
      }
      return NextResponse.json({ ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[api/emails/test-configurable]", msg);
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/emails/test-configurable] exception", e);
    return NextResponse.json(
      { ok: false, error: msg || "Erreur serveur lors de l'envoi de test." },
      { status: 500 }
    );
  }
}
