import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

if (!secretKey && typeof window === "undefined") {
  console.warn("[stripe] STRIPE_SECRET_KEY est absent : les routes Stripe ne fonctionneront pas.");
}

/** Client Stripe serveur uniquement — ne jamais importer ce module dans un composant client. */
export const stripe: Stripe | null = secretKey
  ? new Stripe(secretKey, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    })
  : null;

export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error("STRIPE_SECRET_KEY manquante ou invalide.");
  }
  return stripe;
}
