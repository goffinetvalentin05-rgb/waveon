import { NextResponse, type NextRequest } from "next/server";
import { render } from "@react-email/render";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatPrice, normalizeBusinessCurrency } from "@/lib/utils/formatPrice";
import { renderTemplateText, sanitizeUrl } from "@/lib/emails/configurable";
import { plainTextToParagraphs, templateBodyToParagraphs } from "@/lib/emails/email-body-utils";
import { defaultEmailBody, defaultEmailSubject } from "@/lib/emails/default-copy";
import { publicBookingAbsoluteUrl } from "@/lib/wavon/public-page-url";
import ReservationConfirmation from "@/lib/emails/templates/ReservationConfirmation";
import ReservationCancellation from "@/lib/emails/templates/ReservationCancellation";
import ReservationReminder from "@/lib/emails/templates/ReservationReminder";
import ReservationPostService from "@/lib/emails/templates/ReservationPostService";

type Body = {
  businessId?: string;
  variant?: "confirmation" | "cancellation" | "reminder" | "post_service";
  subject?: string;
  body?: string;
  isPending?: boolean;
};

type DbBiz = {
  business_name: string | null;
  public_display_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  currency: string | null;
  public_logo_url: string | null;
  public_slug: string | null;
};

function formatBizAddress(b: DbBiz | null): string {
  if (!b) return "";
  const line2 = [b.postal_code?.trim(), b.city?.trim()].filter(Boolean).join(" ");
  return [b.address?.trim(), line2].filter(Boolean).join(", ");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
    }

    const parsed = (await req.json().catch(() => null)) as Body | null;
    const businessId = String(parsed?.businessId ?? "").trim();
    const variant = parsed?.variant ?? "confirmation";
    if (!businessId) {
      return NextResponse.json({ ok: false, error: "businessId requis." }, { status: 400 });
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
        "business_name,public_display_name,phone,address,city,postal_code,currency,public_logo_url,public_slug"
      )
      .eq("id", businessId)
      .maybeSingle();
    const b = (biz as DbBiz | null) ?? null;
    const displayName = b?.public_display_name?.trim() || b?.business_name || "Commerce démo";
    const currency = normalizeBusinessCurrency(b?.currency);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://waevon.com";

    const vars = {
      business_name: displayName,
      client_name: "Jean Dupont",
      service_name: "Coupe + brushing",
      reservation_date: "mardi 21 avril 2026",
      reservation_time: "14h30",
      business_phone: String(b?.phone ?? "022 123 45 67"),
      business_address: formatBizAddress(b) || "Rue du Lac 10, 1000 Lausanne",
      service_price: formatPrice(85, currency),
    };

    const isPending = Boolean(parsed?.isPending);
    const merchantLogoUrl = b?.public_logo_url?.trim() || null;
    const rebookUrl = b?.public_slug?.trim()
      ? publicBookingAbsoluteUrl(b.public_slug)
      : baseUrl;
    const unsubscribeUrl = `${baseUrl}/confidentialite`;

    let html: string;

    if (variant === "confirmation") {
      const rawBody =
        parsed?.body?.trim() || defaultEmailBody("confirmation");
      const customIntro = templateBodyToParagraphs(rawBody, vars);
      html = await render(
        ReservationConfirmation({
          businessName: displayName,
          clientName: vars.client_name,
          serviceName: vars.service_name,
          date: vars.reservation_date,
          time: vars.reservation_time,
          durationMin: 45,
          formattedPrice: vars.service_price,
          address: vars.business_address,
          phone: vars.business_phone,
          cancelUrl: `${baseUrl}/annuler?reservationId=demo&token=demo`,
          isPending,
          merchantLogoUrl,
          customIntroParagraphs: customIntro,
        })
      );
    } else if (variant === "cancellation") {
      const subj = parsed?.subject?.trim()
        ? renderTemplateText(parsed.subject, vars)
        : defaultEmailSubject("cancellation");
      void subj;
      const rawBody =
        parsed?.body?.trim() || defaultEmailBody("cancellation");
      const customIntro = templateBodyToParagraphs(rawBody, vars);
      html = await render(
        ReservationCancellation({
          businessName: displayName,
          clientName: vars.client_name,
          serviceName: vars.service_name,
          date: vars.reservation_date,
          time: vars.reservation_time,
          durationMin: 45,
          formattedPrice: vars.service_price,
          rebookUrl,
          merchantLogoUrl,
          customIntroParagraphs: customIntro,
        })
      );
    } else if (variant === "reminder") {
      const rawBody =
        parsed?.body?.trim() ||
        "Bonjour {{client_name}},\n\nPetit rappel : votre rendez-vous approche.";
      const bodyParas = plainTextToParagraphs(renderTemplateText(rawBody, vars));
      html = await render(
        ReservationReminder({
          businessName: displayName,
          clientName: vars.client_name,
          serviceName: vars.service_name,
          date: vars.reservation_date,
          time: vars.reservation_time,
          durationMin: 45,
          formattedPrice: vars.service_price,
          address: vars.business_address,
          phone: vars.business_phone,
          cancelUrl: `${baseUrl}/annuler?reservationId=demo&token=demo`,
          merchantLogoUrl,
          customBodyParagraphs: bodyParas,
          unsubscribeUrl,
          previewText: parsed?.subject?.trim()
            ? renderTemplateText(parsed.subject, vars)
            : "Rappel — démo",
        })
      );
    } else {
      const rawBody =
        parsed?.body?.trim() ||
        "Bonjour {{client_name}},\n\nMerci pour votre visite chez {{business_name}}.";
      const bodyParas = plainTextToParagraphs(renderTemplateText(rawBody, vars));
      const links = {
        google_review: "https://google.com/maps",
        instagram: "https://instagram.com",
        tiktok: "",
        website: "https://waevon.com",
        other_label: "Portfolio",
        other_url: "https://example.com",
      };
      const buttons: Array<{ label: string; href: string }> = [];
      const google = sanitizeUrl(links.google_review);
      const insta = sanitizeUrl(links.instagram);
      const tiktok = sanitizeUrl(links.tiktok);
      const website = sanitizeUrl(links.website);
      const otherUrl = sanitizeUrl(links.other_url);
      if (google) buttons.push({ label: "Laisser un avis Google", href: google });
      if (insta) buttons.push({ label: "Nous suivre sur Instagram", href: insta });
      if (tiktok) buttons.push({ label: "Nous suivre sur TikTok", href: tiktok });
      if (website) buttons.push({ label: "Visiter notre site", href: website });
      if (otherUrl) buttons.push({ label: links.other_label || "Autre lien", href: otherUrl });

      html = await render(
        ReservationPostService({
          businessName: displayName,
          clientName: vars.client_name,
          merchantLogoUrl,
          customBodyParagraphs: bodyParas,
          buttons,
          unsubscribeUrl,
          previewText: parsed?.subject?.trim()
            ? renderTemplateText(parsed.subject, vars)
            : "Merci — démo",
        })
      );
    }

    return NextResponse.json({ ok: true, html });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
