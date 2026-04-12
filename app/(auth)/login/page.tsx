"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogoLink } from "@/components/landing/BrandLogoLink";
import {
  authAlertConfig,
  authBtnPrimaryWide,
  authCard,
  authFooter,
  authFooterLink,
  authInput,
  authLabel,
  authMain,
  authMessage,
  authScreen,
  authSubtitle,
  authTitle,
} from "@/components/auth/auth-ui";
import { landingContent } from "@/lib/landing/config";
import { supabase } from "@/lib/supabase";

const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    setLoading(false);
  };

  return (
    <div className={authScreen}>
      <div className={authMain}>
        <div className={authCard}>
          <div className="mb-6">
            <BrandLogoLink brand={landingContent.brand} variant="header" />
            <h1 className={authTitle}>Connexion</h1>
            <p className={authSubtitle}>
              Connecte-toi pour gérer tes réservations et ton agenda.
            </p>
            {!hasSupabaseConfig ? (
              <p className={`mt-4 ${authAlertConfig}`}>
                Configuration Supabase manquante. Ajoutez NEXT_PUBLIC_SUPABASE_URL
                et NEXT_PUBLIC_SUPABASE_ANON_KEY.
              </p>
            ) : null}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className={authLabel} htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                className={authInput}
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={!isReady}
              />
            </div>
            <div>
              <label className={authLabel} htmlFor="login-password">
                Mot de passe
              </label>
              <input
                id="login-password"
                className={authInput}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={!isReady}
              />
            </div>
            {message ? <p className={authMessage}>{message}</p> : null}
            <button
              className={authBtnPrimaryWide}
              type="submit"
              disabled={loading || !isReady}
            >
              {loading ? "Chargement..." : "Se connecter"}
            </button>
          </form>

          <div className={authFooter}>
            Pas encore de compte ?{" "}
            <Link href="/signup" className={authFooterLink}>
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
