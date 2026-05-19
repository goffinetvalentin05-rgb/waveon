"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { ui } from "@/lib/design/tokens";
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
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [loading, setLoading] = useState(false);
  const [forgotView, setForgotView] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const afterAuthPath = safeInternalPath(searchParams.get("redirect"));

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(afterAuthPath);
    });
  }, [router, afterAuthPath]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasSupabaseConfig) {
      setMessage("Configuration Supabase manquante.");
      setMessageTone("error");
      return;
    }
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setMessageTone("error");
      setLoading(false);
      return;
    }
    router.replace(afterAuthPath);
    setLoading(false);
  };

  const handleForgot = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = forgotEmail.trim().toLowerCase();
    if (!trimmed) {
      setMessage("Indique une adresse email valide.");
      setMessageTone("error");
      return;
    }
    setForgotLoading(true);
    setMessage(null);
    const redirectTo = `${window.location.origin}/update-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
    setForgotLoading(false);
    if (error) {
      setMessage(error.message);
      setMessageTone("error");
      return;
    }
    setMessage(
      "Si un compte existe pour cette adresse, tu recevras un email avec un lien pour choisir un nouveau mot de passe."
    );
    setMessageTone("success");
  };

  return (
    <AuthShell
      title={forgotView ? "Mot de passe oublié" : "Connexion"}
      subtitle={
        forgotView
          ? "Saisis ton email : on t'envoie un lien de réinitialisation."
          : "Connecte-toi pour rejoindre ta ligue et jouer tes cartes."
      }
      footer={
        forgotView ? null : (
          <>
            Pas encore de compte ?{" "}
            <Link href="/signup" className="font-semibold text-white hover:underline">
              S&apos;inscrire
            </Link>
          </>
        )
      }
    >
      {forgotView ? (
        <form className="space-y-4" onSubmit={handleForgot}>
          <div>
            <label htmlFor="forgot-email" className={ui.label}>Email</label>
            <input
              id="forgot-email"
              type="email"
              placeholder="ton@email.com"
              className={ui.input}
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
              disabled={forgotLoading}
            />
          </div>
          {message ? <MessageBox tone={messageTone}>{message}</MessageBox> : null}
          <button type="submit" className={`${ui.btnPrimary} w-full`} disabled={forgotLoading}>
            {forgotLoading ? "Envoi…" : "Envoyer le lien"}
          </button>
          <button
            type="button"
            className="block w-full text-center text-xs text-white/50 hover:text-white"
            onClick={() => {
              setForgotView(false);
              setMessage(null);
              setEmail(forgotEmail);
            }}
          >
            Retour à la connexion
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login-email" className={ui.label}>Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="ton@email.com"
              className={ui.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <div className="flex items-end justify-between">
              <label htmlFor="login-password" className={ui.label}>Mot de passe</label>
              <button
                type="button"
                className="mb-2 text-xs text-white/55 hover:text-white"
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
              type="password"
              placeholder="••••••••"
              className={ui.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {message ? <MessageBox tone={messageTone}>{message}</MessageBox> : null}
          <button type="submit" className={`${ui.btnPrimary} w-full`} disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

function MessageBox({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const tones = {
    error: "border-rose-400/30 bg-rose-500/10 text-rose-200",
    success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  } as const;
  return (
    <p className={`rounded-xl border px-3 py-2 text-xs ${tones[tone]}`}>{children}</p>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Connexion">
          <p className="text-sm text-white/60">Chargement…</p>
        </AuthShell>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
