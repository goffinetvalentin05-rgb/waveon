import { randomInt } from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function prefixFromName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return (cleaned.slice(0, 3) || "WON").padEnd(3, "X");
}

function randomSuffix(length = 4): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

export function generateJoinCode(name: string): string {
  return `${prefixFromName(name)}-${randomSuffix(4)}`;
}

export function normalizeJoinCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}
