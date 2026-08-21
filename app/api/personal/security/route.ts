import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/crm/server";
import {
  cookieOptions,
  hashPin,
  isValidPin,
  PERSONAL_UNLOCK_COOKIE,
  unlockToken,
  verifyPin,
} from "@/lib/personal/pin";
import { fetchPersonalSecurity } from "@/lib/personal/security";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const row = await fetchPersonalSecurity(supabase, user.id);
  const hasPin = Boolean(row?.pin_hash);
  const lockEnabled = Boolean(row?.lock_enabled && hasPin);
  return NextResponse.json({
    lockEnabled,
    hasPin,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json().catch(() => ({}));
  const current = await fetchPersonalSecurity(supabase, user.id);

  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  const currentPin = typeof body.current_pin === "string" ? body.current_pin.trim() : "";
  const clearPin = body.clear_pin === true;
  const lockEnabled = typeof body.lock_enabled === "boolean" ? body.lock_enabled : undefined;

  if (current?.pin_hash && (pin || clearPin || lockEnabled === false || lockEnabled === true)) {
    if (pin || clearPin || (lockEnabled === false && current.lock_enabled)) {
      if (!currentPin || !verifyPin(currentPin, current.pin_hash)) {
        return NextResponse.json({ error: "PIN actuel incorrect." }, { status: 403 });
      }
    } else if (lockEnabled === true && current.pin_hash) {
      if (!currentPin || !verifyPin(currentPin, current.pin_hash)) {
        return NextResponse.json({ error: "PIN actuel incorrect." }, { status: 403 });
      }
    }
  }

  if (pin && !isValidPin(pin)) {
    return NextResponse.json({ error: "Le PIN doit contenir 4 à 8 chiffres." }, { status: 400 });
  }

  const nextHash = clearPin ? null : pin ? hashPin(pin) : current?.pin_hash ?? null;
  const nextLock =
    lockEnabled === undefined
      ? Boolean(current?.lock_enabled && nextHash)
      : Boolean(lockEnabled && nextHash);

  if (nextLock && !nextHash) {
    return NextResponse.json(
      { error: "Définissez un PIN avant d'activer le verrouillage." },
      { status: 400 }
    );
  }

  const payload = {
    user_id: user.id,
    pin_hash: nextHash,
    lock_enabled: nextLock,
  };

  const { error } = current
    ? await supabase.from("personal_security").update(payload).eq("user_id", user.id)
    : await supabase.from("personal_security").insert(payload);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const store = await cookies();
  if (nextLock && nextHash && (pin || current?.pin_hash)) {
    const tokenHash = nextHash;
    store.set(PERSONAL_UNLOCK_COOKIE, unlockToken(user.id, tokenHash), cookieOptions());
  }
  if (!nextLock) {
    store.set(PERSONAL_UNLOCK_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  }

  return NextResponse.json({
    lockEnabled: nextLock,
    hasPin: Boolean(nextHash),
  });
}
