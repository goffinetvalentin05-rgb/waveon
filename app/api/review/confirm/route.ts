import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Payload = {
  participationId?: string;
  clientToken?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const participationId = body.participationId?.trim();
    const clientToken = body.clientToken?.trim();

    if (!participationId || !clientToken) {
      return NextResponse.json(
        { error: "Paramètres manquants." },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("participations")
      .update({ did_review: true, review_validated_at: new Date().toISOString() })
      .eq("id", participationId)
      .eq("client_token", clientToken)
      .select("id,did_review")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Validation impossible." },
        { status: 500 }
      );
    }

    return NextResponse.json({ validated: data.did_review });
  } catch (error) {
    return NextResponse.json(
      { error: "Requête invalide." },
      { status: 400 }
    );
  }
}
