export type TemplateVars = Record<string, string>;

export function renderTemplateText(input: string, vars: TemplateVars): string {
  return input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    const v = vars[key];
    return v !== undefined ? v : "";
  });
}

export function splitLines(body: string): string[] {
  return String(body ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((x) => x.trimEnd());
}

export function sanitizeUrl(url: string | null | undefined): string | null {
  const raw = String(url ?? "").trim();
  if (!raw) return null;
  // Basic allowlist: http(s) only (avoid javascript:)
  if (!/^https?:\/\//i.test(raw)) return null;
  return raw;
}

