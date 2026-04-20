import { NextResponse, type NextRequest } from "next/server";
import { render } from "@react-email/render";
import { getResend, EMAIL_FROM } from "@/lib/resend";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ReminderClient from "@/lib/emails/templates/reminder-client";
import PostServiceClient from "@/lib/emails/templates/post-service-client";
import { renderTemplateText, sanitizeUrl, splitLines } from "@/lib/emails/configurable";

type EmailSettingType = "reminder_before" | "post_service";

type DbSetting = {
  type: EmailSettingType;
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
  email: string | null;
};

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Non disponible en production." }, { status: 403 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: false, error: "RESEND_API_KEY manquante." }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as { businessId?: string; type?: EmailSettingType; to?: string } | null;
  const businessId = String(body?.businessId ?? "").trim();
  const type = (String(body?.type ?? "") as EmailSettingType) || "reminder_before";
  const to = String(body?.to ?? "").trim();

  if (!businessId || !to) {
    return NextResponse.json({ ok: false, error: "businessId et to requis." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: biz, error: bErr } = await supabase
    .from("wavon_businesses")
    .select("business_name,public_display_name,phone,address,email")
    .eq("id", businessId)
    .maybeSingle();
  if (bErr) return NextResponse.json({ ok: false, error: bErr.message }, { status: 500 });
  const business = (biz as DbBusiness | null) ?? null;

  const { data: s, error: sErr } = await supabase
    .from("wavon_email_settings")
    .select("type,enabled,delay_hours,subject,body,custom_links")
    .eq("business_id", businessId)
    .eq("type", type)
    .maybeSingle();
  if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });

  const setting = s as DbSetting | null;
  if (!setting) return NextResponse.json({ ok: false, error: "Réglage introuvable." }, { status: 404 });

  const displayName = business?.public_display_name?.trim() || business?.business_name || "Commerce";
  const vars = {
    business_name: displayName,
    client_name: "Client test",
    service_name: "Prestation test",
    reservation_date: "mardi 21 avril 2026",
    reservation_time: "14h30",
    business_phone: String(business?.phone ?? ""),
    business_address: String(business?.address ?? ""),
    service_price: "CHF 45.00",
  };

  const subject = renderTemplateText(setting.subject || "", vars);
  const bodyText = renderTemplateText(setting.body || "", vars);

  const resend = getResend();
  let html: string;

  if (type === "post_service") {
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
        previewText: subject || `[TEST] Merci — ${displayName}`,
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
        previewText: subject || `[TEST] Rappel — ${displayName}`,
        title: "Rappel de rendez-vous",
        greeting: `Bonjour ${vars.client_name},`,
        lines: splitLines(bodyText),
        address: vars.business_address || undefined,
        phone: vars.business_phone || undefined,
      })
    );
  }

  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: subject || `[TEST] Email ${type}`,
    html,
  });

  return NextResponse.json({ ok: true, id: result.data?.id });
}

