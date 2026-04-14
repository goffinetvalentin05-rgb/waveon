import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "[Supabase] Variables d’environnement manquantes. " +
      "NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

/**
 * Client navigateur : session via cookies (aligné avec le middleware SSR).
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
