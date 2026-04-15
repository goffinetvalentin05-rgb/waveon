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
import { supabase } from "@/lib/supabase/client";

const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const readSession = () => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        if (session) setHasSession(true);
      });
    };

    readSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      readSession();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
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
    if (password !== confirm) {
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace("/dashboard");
  };

  if (!hasSupabaseConfig) {
    return (
      <div className={authScreen}>
        <div className={authMain}>
          <div className={authCard}>
            <BrandLogoLink brand={landingContent.brand} variant="header" />
            <h1 className={authTitle}>Nouveau mot de passe</h1>
            <p className={`mt-4 ${authAlertConfig}`}>
              Configuration Supabase manquante. Ajoutez NEXT_PUBLIC_SUPABASE_URL et
              NEXT_PUBLIC_SUPABASE_ANON_KEY.
            </p>
            <div className={`mt-7 ${authFooter}`}>
              <Link href="/login" className={authFooterLink}>
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className={authScreen}>
        <div className={authMain}>
          <div className={authCard}>
            <BrandLogoLink brand={landingContent.brand} variant="header" />
            <h1 className={authTitle}>Lien invalide ou expiré</h1>
            <p className={authSubtitle}>
              Ce lien de réinitialisation n’est plus valide. Demande un nouveau lien depuis
              la page de connexion.
            </p>
            <div className={`mt-7 ${authFooter}`}>
              <Link href="/login" className={authFooterLink}>
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={authScreen}>
      <div className={authMain}>
        <div className={authCard}>
          <div className="mb-6">
            <BrandLogoLink brand={landingContent.brand} variant="header" />
            <h1 className={authTitle}>Nouveau mot de passe</h1>
            <p className={authSubtitle}>Choisis un mot de passe sécurisé pour ton compte.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className={authLabel} htmlFor="reset-password">
                Mot de passe
              </label>
              <input
                id="reset-password"
                className={authInput}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className={authLabel} htmlFor="reset-password-confirm">
                Confirmer le mot de passe
              </label>
              <input
                id="reset-password-confirm"
                className={authInput}
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                required
                disabled={loading}
              />
            </div>
            {message ? <p className={authMessage}>{message}</p> : null}
            <button className={authBtnPrimaryWide} type="submit" disabled={loading}>
              {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
            </button>
          </form>

          <div className={authFooter}>
            <Link href="/login" className={authFooterLink}>
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
