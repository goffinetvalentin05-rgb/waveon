import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { analyzeMeetingNotes } from "@/lib/crm/meeting-ai";
import { loadWritableProspect } from "@/lib/crm/meeting-server";
import { emptyMeetingReport, isMeetingType } from "@/lib/crm/meetings";

export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase } = auth;
  const { id } = await params;

  const prospect = await loadWritableProspect(supabase, id);
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const form = await request.formData();
  const notes = String(form.get("notes") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const meetingType = String(form.get("meeting_type") ?? "");
  const files = form.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);

  if (!notes && files.length === 0) {
    return NextResponse.json(
      { error: "Ajoutez une photo ou des notes avant d’analyser." },
      { status: 400 }
    );
  }

  const images: { mime: string; base64: string }[] = [];
  for (const file of files.slice(0, 6)) {
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Une image dépasse 8 Mo." }, { status: 400 });
    }
    const mime = ALLOWED.has(file.type) ? file.type : "image/jpeg";
    const buffer = Buffer.from(await file.arrayBuffer());
    images.push({ mime, base64: buffer.toString("base64") });
  }

  try {
    const result = await analyzeMeetingNotes({
      images,
      notes,
      context: {
        clubName: prospect.club_name,
        title,
        meetingType: isMeetingType(meetingType) ? meetingType : undefined,
      },
    });
    return NextResponse.json({
      draft: true,
      extracted_text: result.extracted_text,
      report: result.report.summary || result.extracted_text ? result.report : emptyMeetingReport(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analyse impossible.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
