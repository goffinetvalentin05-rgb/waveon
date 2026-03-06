"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const title = mode === "login" ? "Connexion" : "Créer mon compte";
  const isReady = mounted && hasSupabaseConfig;

  useEffect(() => {
    if (!mounted || !hasSupabaseConfig) return;
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/dashboard");
      }
    };
    checkSession();
  }, [router, mounted]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasSupabaseConfig) {
      setMessage(
        "Configuration Supabase manquante. Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }
    setLoading(true);
    setMessage(null);

    if (mode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      if (data.user) {
        const { error: profileError } = await supabase
          .from("users")
          .insert({
            id: data.user.id,
            email: data.user.email,
          });
        if (profileError && process.env.NODE_ENV !== "production") {
          console.warn(
            "[Supabase] Impossible de créer le profil user:",
            profileError.message
          );
        }
      }
      setMessage(
        "Compte créé. Vérifie tes emails si la confirmation est activée."
      );
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      if (data.user) {
        const { error: profileError } = await supabase
          .from("users")
          .upsert(
            { id: data.user.id, email: data.user.email },
            { onConflict: "id" }
          );
        if (profileError && process.env.NODE_ENV !== "production") {
          console.warn(
            "[Supabase] Impossible de synchroniser le profil user:",
            profileError.message
          );
        }
      }
      router.replace("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080808]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(57,255,20,0.14),transparent_60%)]" />
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
        <div className="relative rounded-3xl border border-[#39FF14]/20 bg-[#0f0f0f] p-8 shadow-[0_24px_52px_rgba(57,255,20,0.12)]">
          <div className="mb-6">
            <div className="mb-6 flex flex-col items-start leading-none">
              <span className="text-xl font-extrabold tracking-[0.22em] text-[#39FF14]">
                WAEVON
              </span>
              <span className="mt-1 h-[3px] w-28 rounded-full bg-[#39FF14]" />
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white">
              {title}
            </h1>
            <p className="mt-2 text-sm text-[#555]">
              Accède à ton dashboard et active ton agent WhatsApp.
            </p>
            {!hasSupabaseConfig ? (
              <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-300">
                Configuration Supabase manquante. Ajoutez
                NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.
              </p>
            ) : null}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                Email
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:border-[#39FF14] focus:outline-none"
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={!isReady}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                Mot de passe
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:border-[#39FF14] focus:outline-none"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={!isReady}
              />
            </div>
            {message ? (
              <p className="rounded-xl border border-[#39FF14]/20 bg-[#39FF14]/10 px-4 py-3 text-xs text-white/85">
                {message}
              </p>
            ) : null}
            <button
              className="w-full rounded-xl bg-[#39FF14] px-4 py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-60"
              type="submit"
              disabled={loading || !isReady}
            >
              {loading ? "Chargement..." : "Se connecter"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#888]">
            {mode === "login" ? (
              <>
                Pas encore de compte ?{" "}
                <a
                  href="/onboarding"
                  className="font-semibold text-[#39FF14] hover:underline"
                >
                  S'inscrire
                </a>
              </>
            ) : (
              <>
                Déjà un compte ?{" "}
                <a href="/login" className="font-semibold text-[#39FF14] hover:underline">
                  Se connecter
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

