import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getResend, EMAIL_FROM } from "@/lib/resend";
import { brand } from "@/lib/brand/config";
import { nextBirthdayDate } from "@/lib/calendar/helpers";
import { dateInTimezone } from "@/lib/calendar/timezone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BirthdayRow = {
  id: string;
  user_id: string;
  person_name: string;
  birth_date: string;
  note: string | null;
  remind_day_before: boolean;
  remind_same_day: boolean;
};

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Cron quotidien : rappels anniversaire (veille + jour J).
 * Auth: Authorization: Bearer CRON_SECRET
 */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminSupabaseClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Admin Supabase indisponible" },
      { status: 500 }
    );
  }

  const { data: birthdays, error } = await admin
    .from("birthdays")
    .select("*")
    .or("remind_day_before.eq.true,remind_same_day.eq.true");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (birthdays ?? []) as BirthdayRow[];
  const byUser = new Map<string, BirthdayRow[]>();
  for (const b of rows) {
    const list = byUser.get(b.user_id) ?? [];
    list.push(b);
    byUser.set(b.user_id, list);
  }

  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const [userId, list] of byUser) {
    const { data: prefs } = await admin
      .from("user_preferences")
      .select("timezone")
      .eq("user_id", userId)
      .maybeSingle();

    const tz =
      prefs?.timezone ||
      process.env.USER_TIMEZONE?.trim() ||
      "Europe/Zurich";
    const today = dateInTimezone(tz);
    const tomorrow = addDaysISO(today, 1);

    const { data: authUser, error: userErr } =
      await admin.auth.admin.getUserById(userId);
    if (userErr || !authUser.user?.email) {
      failures.push(`user ${userId}: email introuvable`);
      continue;
    }
    const email = authUser.user.email;

    for (const b of list) {
      const next = nextBirthdayDate(b.birth_date, today);
      const jobs: { type: "day_before" | "same_day"; forDate: string }[] = [];

      if (b.remind_same_day && next === today) {
        jobs.push({ type: "same_day", forDate: today });
      }
      if (b.remind_day_before && next === tomorrow) {
        jobs.push({ type: "day_before", forDate: tomorrow });
      }

      for (const job of jobs) {
        const { data: existing } = await admin
          .from("birthday_reminder_logs")
          .select("id")
          .eq("birthday_id", b.id)
          .eq("reminder_type", job.type)
          .eq("sent_for_date", job.forDate)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        const subject =
          job.type === "same_day"
            ? `🎂 Anniversaire de ${b.person_name} aujourd'hui`
            : `🎂 Anniversaire de ${b.person_name} demain`;

        const bodyText = [
          job.type === "same_day"
            ? `C'est l'anniversaire de ${b.person_name} aujourd'hui.`
            : `L'anniversaire de ${b.person_name} est demain.`,
          b.note ? `\nNote : ${b.note}` : "",
          `\n— ${brand.name}`,
        ].join("");

        try {
          await getResend().emails.send({
            from: EMAIL_FROM,
            to: email,
            subject,
            text: bodyText,
          });

          const { error: logErr } = await admin
            .from("birthday_reminder_logs")
            .insert({
              birthday_id: b.id,
              reminder_type: job.type,
              sent_for_date: job.forDate,
            });

          if (logErr) {
            failures.push(`log ${b.id}: ${logErr.message}`);
          } else {
            sent++;
          }
        } catch (e) {
          failures.push(
            `send ${b.id}: ${e instanceof Error ? e.message : "erreur"}`
          );
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    failures,
    checked: rows.length,
  });
}
