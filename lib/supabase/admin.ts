import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** Secret serveur uniquement — jamais NEXT_PUBLIC_, jamais exposé au client. */
export function getSupabaseServiceRoleKey(): string | undefined {
  const v = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return v || undefined;
}

/** Noms d’env visibles par Node liés au rôle service (diagnostic sans valeurs). */
export function supabaseServiceRoleRelatedEnvKeyNames(): string[] {
  return Object.keys(process.env).filter((k) => k.toUpperCase().includes("SERVICE_ROLE"));
}

export function supabaseServiceRoleKeyMissingUserMessage(): string {
  if (process.env.VERCEL === "1") {
    return (
      "SUPABASE_SERVICE_ROLE_KEY absente pour ce déploiement. " +
      "Dans Supabase : Project Settings → API → « service_role » (secret). " +
      "Sur Vercel : Settings → Environment Variables, nom exact SUPABASE_SERVICE_ROLE_KEY, coche Production, enregistre, puis Redeploy. " +
      "Comme pour Resend, un déploiement antérieur à la variable ne l’a pas."
    );
  }
  return (
    "SUPABASE_SERVICE_ROLE_KEY absente. Ajoute-la dans .env.local à la racine du projet, puis redémarre npm run dev."
  );
}

export const createAdminSupabaseClient = (): SupabaseClient => {
  const serviceRoleKey = getSupabaseServiceRoleKey() ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Configuration Supabase admin manquante. " +
        "NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};
