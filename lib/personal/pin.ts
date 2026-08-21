import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const PERSONAL_UNLOCK_COOKIE = "wo_personal_unlock";

const PIN_RE = /^\d{4,8}$/;

export function isValidPin(pin: string): boolean {
  return PIN_RE.test(pin);
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const check = scryptSync(pin, salt, 64).toString("hex");
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(check, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function unlockToken(userId: string, pinHash: string): string {
  return createHmac("sha256", pinHash).update(userId).digest("hex");
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export async function isPersonalUnlocked(userId: string, pinHash: string | null): Promise<boolean> {
  if (!pinHash) return true;
  const store = await cookies();
  const token = store.get(PERSONAL_UNLOCK_COOKIE)?.value;
  if (!token) return false;
  const expected = unlockToken(userId, pinHash);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
