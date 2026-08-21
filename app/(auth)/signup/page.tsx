"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { brand } from "@/lib/brand/config";
import { ui } from "@/lib/design/tokens";
import { supabase } from "@/lib/supabase/client";

const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function SignupContent() {
  const router = useRouter();
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
        typeof window !== "undefined" ? `${window.location.origin}/home` : undefined;
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
          "Compte créé. Un email de confirmation vient d'être envoyé. Cliquez sur le lien reçu pour activer votre compte."
        );
        return;
      }
      router.replace("/home");
    } catch {
      setMessage("Erreur technique. Réessayez dans quelques instants.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Créer un compte"
      subtitle={brand.tagline}
      footer={
        <>
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-emerald-400 hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSignup}>
        <div>
          <label htmlFor="signup-email" className={ui.label}>
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            placeholder="vous@email.com"
            className={ui.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="signup-password" className={ui.label}>
            Mot de passe
          </label>
          <input
            id="signup-password"
            type="password"
            placeholder="••••••••"
            className={ui.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="signup-confirm" className={ui.label}>
            Confirmer
          </label>
          <input
            id="signup-confirm"
            type="password"
            placeholder="••••••••"
            className={ui.input}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        {message ? (
          <p className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-[#c2d4cc]">
            {message}
          </p>
        ) : null}
        <button type="submit" className={`${ui.btnPrimary} w-full`} disabled={loading}>
          {loading ? "Création…" : "Créer mon compte"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Créer un compte">
          <p className="text-sm text-[#6b7d76]">Chargement…</p>
        </AuthShell>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
