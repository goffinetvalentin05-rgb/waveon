"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { supabase } from "@/lib/supabase/client";

const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!hasSupabaseConfig) {
      setMessage(
        "Configuration Supabase manquante. Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    if (password.length < 6) {
      setMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) {
        console.log("[signup] signUp error:", error);
        setMessage(error.message);
        return;
      }

      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) {
          console.log("[signup] signIn fallback error:", signInError);
          setMessage(
            "Compte créé, mais la session n'a pas pu être ouverte. Vérifie la confirmation email dans Supabase, puis reconnecte-toi."
          );
          return;
        }
      }

      router.replace("/pricing");
    } catch (err) {
      console.log("[signup] unexpected error:", err);
      setMessage(
        "Impossible de contacter Supabase (Failed to fetch). Vérifie les variables NEXT_PUBLIC_SUPABASE_* sur Vercel et que le projet Supabase est actif."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={authScreen}>
      <div className={authMain}>
        <div className={authCard}>
          <div className="mb-6">
            <BrandLogoLink brand={landingContent.brand} variant="header" />
            <h1 className={authTitle}>Créer mon compte</h1>
            <p className={authSubtitle}>
              Passe en ligne ta page de réservation en quelques minutes.
            </p>
            {!hasSupabaseConfig ? (
              <p className={`mt-4 ${authAlertConfig}`}>
                Configuration Supabase manquante. Ajoutez NEXT_PUBLIC_SUPABASE_URL
                et NEXT_PUBLIC_SUPABASE_ANON_KEY.
              </p>
            ) : null}
          </div>

          <form className="space-y-4" onSubmit={handleSignup}>
            <div>
              <label className={authLabel} htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
                className={authInput}
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={loading || !hasSupabaseConfig}
              />
            </div>

            <div>
              <label className={authLabel} htmlFor="signup-password">
                Mot de passe
              </label>
              <input
                id="signup-password"
                className={authInput}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
                disabled={loading || !hasSupabaseConfig}
              />
            </div>

            <div>
              <label className={authLabel} htmlFor="signup-confirm">
                Confirmer le mot de passe
              </label>
              <input
                id="signup-confirm"
                className={authInput}
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
                disabled={loading || !hasSupabaseConfig}
              />
            </div>

            {message ? <p className={authMessage}>{message}</p> : null}

            <button
              className={authBtnPrimaryWide}
              type="submit"
              disabled={loading || !hasSupabaseConfig}
            >
              {loading ? "Création en cours..." : "Créer mon compte"}
            </button>
          </form>

          <div className={authFooter}>
            Déjà un compte ?{" "}
            <Link href="/login" className={authFooterLink}>
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
