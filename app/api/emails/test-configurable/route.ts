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
import {
  createAdminSupabaseClient,
  getSupabaseServiceRoleKey,
  supabaseServiceRoleKeyMissingUserMessage,
  supabaseServiceRoleRelatedEnvKeyNames,
} from "@/lib/supabase/admin";
import ReminderClient from "@/lib/emails/templates/reminder-client";
import PostServiceClient from "@/lib/emails/templates/post-service-client";
import { renderTemplateText, sanitizeUrl, splitLines } from "@/lib/emails/configurable";
import { defaultEmailBody, defaultEmailSubject } from "@/lib/emails/default-copy";
import type { EmailTemplateType } from "@/lib/wavon/types";
import { formatPrice, normalizeBusinessCurrency } from "@/lib/utils/formatPrice";

type ScheduledKind = "reminder_before" | "post_service";

type Body = {
  businessId?: string;
  to?: string;
  mode?: "scheduled" | "template";
  scheduledType?: ScheduledKind;
  templateType?: EmailTemplateType;
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

    const parsed = (await req.json().catch(() => null)) as Body | null;
    const businessId = String(parsed?.businessId ?? "").trim();
    const to = String(parsed?.to ?? "").trim();
    const mode = parsed?.mode ?? "scheduled";

    if (!businessId || !to) {
      return NextResponse.json({ ok: false, error: "businessId et to requis." }, { status: 400 });
    }

    const { data: bizRow, error: bizErr } = await supabase
      .from("wavon_businesses")
      .select("id,user_id")
      .eq("id", businessId)
      .maybeSingle();
    if (bizErr || !bizRow || (bizRow as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Accès refusé." }, { status: 403 });
    }

    const admin = createAdminSupabaseClient();
    const { data: biz } = await admin
      .from("wavon_businesses")
      .select("business_name,public_display_name,phone,address,city,postal_code,email,currency")
      .eq("id", businessId)
      .maybeSingle();
    const business = (biz as DbBusiness | null) ?? null;
    const displayName = business?.public_display_name?.trim() || business?.business_name || "Commerce";
    const testCurrency = normalizeBusinessCurrency(business?.currency);

    const vars = {
      business_name: displayName,
      client_name: "Client test",
      service_name: "Prestation test",
      reservation_date: "mardi 21 avril 2026",
      reservation_time: "14h30",
      business_phone: String(business?.phone ?? ""),
      business_address: formatBizAddress(business),
      service_price: formatPrice(40, testCurrency),
    };

    let html: string;
    let subject: string;

    if (mode === "template") {
    const templateType = parsed?.templateType ?? "confirmation";
    if (templateType === "reminder") {
      return NextResponse.json({ ok: false, error: "Utilise le mode rappel planifié." }, { status: 400 });
    }
    const { data: tpl } = await admin
      .from("wavon_email_templates")
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
    const bodyText = renderTemplateText(bodyRaw, vars);
    const lines = splitLines(bodyText);
    if (templateType === "cancellation") {
      html = await render(
        ReminderClient({
          businessName: displayName,
          previewText: subject,
          title: "Annulation (test)",
          greeting: `Bonjour ${vars.client_name},`,
          lines,
          phone: vars.business_phone || undefined,
          address: vars.business_address || undefined,
        })
      );
    } else {
      html = await render(
        ReminderClient({
          businessName: displayName,
          previewText: subject,
          title: "Confirmation (test)",
          greeting: `Bonjour ${vars.client_name},`,
          lines,
          address: vars.business_address || undefined,
          phone: vars.business_phone || undefined,
        })
      );
    }
  } else {
    const scheduledType: ScheduledKind = parsed?.scheduledType === "post_service" ? "post_service" : "reminder_before";
    const { data: s } = await admin
      .from("wavon_email_settings")
      .select("type,enabled,delay_hours,subject,body,custom_links")
      .eq("business_id", businessId)
      .eq("type", scheduledType)
      .maybeSingle();
    if (!s) {
      return NextResponse.json({ ok: false, error: "Réglage introuvable." }, { status: 404 });
    }
    const setting = s as DbSetting;
    subject = renderTemplateText(setting.subject || "", vars);
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
      if (insta) buttons.push({ label: "Suivre sur Instagram", href: insta });
      if (tiktok) buttons.push({ label: "Suivre sur TikTok", href: tiktok });
      if (website) buttons.push({ label: "Visiter le site", href: website });
      if (otherUrl) buttons.push({ label: otherLabel || "Ouvrir le lien", href: otherUrl });
      html = await render(
        PostServiceClient({
          businessName: displayName,
          previewText: subject || `[Test] Merci — ${displayName}`,
          title: "Merci pour votre visite",
          greeting: `Bonjour ${vars.client_name},`,
          lines: splitLines(bodyText),
          buttons,
        })
      );
    } else {
      html = await render(
        ReminderClient({
          businessName: displayName,
          previewText: subject || `[Test] Rappel — ${displayName}`,
          title: "Rappel de rendez-vous",
          greeting: `Bonjour ${vars.client_name},`,
          lines: splitLines(bodyText),
          address: vars.business_address || undefined,
          phone: vars.business_phone || undefined,
        })
      );
    }
    subject = subject || `[Test] Email ${scheduledType}`;
  }

  try {
    const resend = getResend();
    const { error: resendErr } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
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
