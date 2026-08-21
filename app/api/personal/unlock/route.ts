import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/crm/server";
import {
  cookieOptions,
  isValidPin,
  PERSONAL_UNLOCK_COOKIE,
  unlockToken,
  verifyPin,
} from "@/lib/personal/pin";
import { fetchPersonalSecurity } from "@/lib/personal/security";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json().catch(() => ({}));
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";

  const row = await fetchPersonalSecurity(supabase, user.id);
  if (!row?.lock_enabled || !row.pin_hash) {
    return NextResponse.json({ unlocked: true });
  }
  if (!isValidPin(pin) || !verifyPin(pin, row.pin_hash)) {
    return NextResponse.json({ error: "PIN incorrect." }, { status: 403 });
  }

  const store = await cookies();
  store.set(PERSONAL_UNLOCK_COOKIE, unlockToken(user.id, row.pin_hash), cookieOptions());
  return NextResponse.json({ unlocked: true });
}
