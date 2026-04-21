const CURRENCY_LOCALE: Record<string, string> = {
  CHF: "fr-CH",
  EUR: "fr-FR",
  USD: "en-US",
  GBP: "en-GB",
  CAD: "fr-CA",
};

const ALLOWED = new Set(["CHF", "EUR", "USD", "GBP", "CAD"]);

export const BUSINESS_CURRENCY_OPTIONS = [
  { value: "CHF", label: "CHF — Franc suisse" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "USD", label: "USD — Dollar US" },
  { value: "GBP", label: "GBP — Livre sterling" },
  { value: "CAD", label: "CAD — Dollar canadien" },
] as const;

export function normalizeBusinessCurrency(code: string | null | undefined): string {
  const c = String(code ?? "").trim().toUpperCase();
  return ALLOWED.has(c) ? c : "CHF";
}

export function formatPrice(amount: number, currency: string): string {
  const code = normalizeBusinessCurrency(currency);
  const locale = CURRENCY_LOCALE[code] ?? "fr-CH";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("fr-CH", {
      style: "currency",
      currency: "CHF",
    }).format(amount);
  }
}

/** Libellé à afficher à côté du champ prix (code ou symbole). */
export function currencyFieldAffix(currency: string): string {
  const code = normalizeBusinessCurrency(currency);
  switch (code) {
    case "EUR":
      return "€";
    case "USD":
      return "$";
    case "GBP":
      return "£";
    case "CHF":
      return "CHF";
    case "CAD":
      return "CAD";
    default:
      return code;
  }
}
