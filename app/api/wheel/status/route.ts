import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Payload = {
  campaignId?: string;
  clientToken?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const campaignId = body.campaignId?.trim();
    const clientToken = body.clientToken?.trim();

    if (!campaignId || !clientToken) {
      return NextResponse.json(
        { error: "Paramètres manquants." },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("spins")
      .select("id,result,wheel_item_id,wheel_items(label,kind)")
      .eq("campaign_id", campaignId)
      .eq("client_token", clientToken)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ spin: null });
    }

    const item = Array.isArray(data.wheel_items)
      ? data.wheel_items[0]
      : data.wheel_items;

    return NextResponse.json({
      spin: {
        id: data.id,
        result: data.result,
        label: item?.label ?? (data.result === "lose" ? "Perdu" : "Résultat"),
        type: item?.kind ?? data.result,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Requête invalide." },
      { status: 400 }
    );
  }
}
