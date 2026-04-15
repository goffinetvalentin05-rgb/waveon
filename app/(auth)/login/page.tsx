"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogoLink } from "@/components/landing/BrandLogoLink";
import {
  authAlertConfig,
  authBtnPrimaryWide,
  authCard,
  authFooter,
  authFooterLink,
  authInlineLink,
  authInput,
  authLabel,
  authMain,
  authMessage,
  authMessageSuccess,
  authScreen,
  authSubtitle,
  authTitle,
} from "@/components/auth/auth-ui";
import { landingContent } from "@/lib/landing/config";
import { supabase } from "@/lib/supabase/client";

const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function safeInternalPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"neutral" | "success">("neutral");
  const [loading, setLoading] = useState(false);
  const [forgotView, setForgotView] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const isReady = hasSupabaseConfig;

  const afterAuthPath = safeInternalPath(searchParams.get("redirect"));

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace(afterAuthPath);
      }
    };
    checkSession();
  }, [router, afterAuthPath]);

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
    setMessageTone("neutral");

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
    router.replace(afterAuthPath);
    setLoading(false);
  };

  const handleForgotSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasSupabaseConfig) {
      setMessage(
        "Configuration Supabase manquante. Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      setMessageTone("neutral");
      return;
    }
    const trimmed = forgotEmail.trim().toLowerCase();
    if (!trimmed) {
      setMessage("Indique une adresse email valide.");
      setMessageTone("neutral");
      return;
    }

    setForgotLoading(true);
    setMessage(null);
    const redirectTo = `${window.location.origin}/update-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo,
    });
    setForgotLoading(false);

    if (error) {
      setMessage(error.message);
      setMessageTone("neutral");
      return;
    }

    setMessage(
      "Si un compte existe pour cette adresse, tu recevras un email avec un lien pour choisir un nouveau mot de passe."
    );
    setMessageTone("success");
  };

  return (
    <div className={authScreen}>
      <div className={authMain}>
        <div className={authCard}>
          <div className="mb-6">
            <BrandLogoLink brand={landingContent.brand} variant="header" />
            <h1 className={authTitle}>
              {forgotView ? "Mot de passe oublié" : "Connexion"}
            </h1>
            <p className={authSubtitle}>
              {forgotView
                ? "Saisis ton email : nous t’envoyons un lien pour définir un nouveau mot de passe."
                : "Connecte-toi pour gérer tes réservations et ton agenda."}
            </p>
            {!hasSupabaseConfig ? (
              <p className={`mt-4 ${authAlertConfig}`}>
                Configuration Supabase manquante. Ajoutez NEXT_PUBLIC_SUPABASE_URL
                et NEXT_PUBLIC_SUPABASE_ANON_KEY.
              </p>
            ) : null}
          </div>

          {forgotView ? (
            <form className="space-y-4" onSubmit={handleForgotSubmit}>
              <div>
                <label className={authLabel} htmlFor="forgot-email">
                  Email
                </label>
                <input
                  id="forgot-email"
                  className={authInput}
                  type="email"
                  placeholder="ton@email.com"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  required
                  disabled={forgotLoading || !isReady}
                />
              </div>
              {message ? (
                <p
                  className={
                    messageTone === "success" ? authMessageSuccess : authMessage
                  }
                >
                  {message}
                </p>
              ) : null}
              <button
                className={authBtnPrimaryWide}
                type="submit"
                disabled={forgotLoading || !isReady}
              >
                {forgotLoading ? "Envoi…" : "Envoyer le lien"}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  className={authInlineLink}
                  onClick={() => {
                    setForgotView(false);
                    setMessage(null);
                    setEmail(forgotEmail);
                  }}
                >
                  Retour à la connexion
                </button>
              </div>
            </form>
          ) : (
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
                <div className="flex items-end justify-between gap-3">
                  <label className={authLabel} htmlFor="login-password">
                    Mot de passe
                  </label>
                  <button
                    type="button"
                    className={`${authInlineLink} shrink-0 pb-0.5`}
                    onClick={() => {
                      setForgotView(true);
                      setMessage(null);
                      setForgotEmail(email);
                    }}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
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
          )}

          {!forgotView ? (
            <div className={authFooter}>
              Pas encore de compte ?{" "}
              <Link href="/signup" className={authFooterLink}>
                S&apos;inscrire
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className={authScreen}>
          <div className={authMain}>
            <div className={authCard}>
              <p className="text-sm text-neutral-500">Chargement…</p>
            </div>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
