import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/crm/server";
import { cookieOptions, PERSONAL_UNLOCK_COOKIE } from "@/lib/personal/pin";

export async function POST() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const store = await cookies();
  store.set(PERSONAL_UNLOCK_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  return NextResponse.json({ unlocked: false });
}
