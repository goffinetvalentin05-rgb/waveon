"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { ui } from "@/lib/design/tokens";
import { supabase } from "@/lib/supabase/client";

const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function safeNext(raw: string | null): string {
  if (raw === "create-league") return "/onboarding?next=create-league";
  if (raw === "contest") return "/onboarding?next=contest";
  return "/onboarding";
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (!hasSupabaseConfig) {
      setMessage("Configuration Supabase manquante.");
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
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const emailRedirectTo =
        typeof window !== "undefined" ? `${window.location.origin}${next}` : undefined;
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { emailRedirectTo },
      });
      if (error) {
        setMessage(error.message);
        return;
      }
      if (!data.session) {
        setMessage(
          "Compte créé. Un email de confirmation vient d'être envoyé. Clique sur le lien reçu pour activer ton compte."
        );
        return;
      }
      router.replace(next);
    } catch {
      setMessage("Erreur technique. Réessaie dans quelques instants.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Créer mon compte"
      subtitle="Pour pronostiquer, jouer des cartes et saboter tes potes pendant le tournoi."
      footer={
        <>
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-white hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSignup}>
        <div>
          <label htmlFor="signup-email" className={ui.label}>Email</label>
          <input
            id="signup-email"
            type="email"
            placeholder="ton@email.com"
            className={ui.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="signup-pw" className={ui.label}>Mot de passe</label>
          <input
            id="signup-pw"
            type="password"
            placeholder="••••••••"
            className={ui.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="signup-pw2" className={ui.label}>Confirmer le mot de passe</label>
          <input
            id="signup-pw2"
            type="password"
            placeholder="••••••••"
            className={ui.input}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={6}
            required
            disabled={loading}
          />
        </div>
        {message ? (
          <p className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {message}
          </p>
        ) : null}
        <button type="submit" className={`${ui.btnPrimary} w-full`} disabled={loading}>
          {loading ? "Création…" : "Créer mon compte"}
        </button>
        <p className="text-center text-[11px] text-white/40">
          En continuant, tu acceptes nos{" "}
          <Link href="/legal/terms" className="underline hover:text-white">conditions</Link>{" "}
          et notre{" "}
          <Link href="/legal/privacy" className="underline hover:text-white">politique de confidentialité</Link>.
        </p>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Créer mon compte">
          <p className="text-sm text-white/60">Chargement…</p>
        </AuthShell>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
