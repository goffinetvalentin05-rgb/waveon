"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { brand } from "@/lib/brand/config";
import { ui } from "@/lib/design/tokens";
import { supabase } from "@/lib/supabase/client";
import { inviteTokenFromPath, safeInternalPath } from "@/lib/auth/invite";

const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const afterAuthPath = safeInternalPath(searchParams.get("redirect"));
  const inviteToken = inviteTokenFromPath(afterAuthPath);
  const [email, setEmail] = useState(() => searchParams.get("email")?.trim().toLowerCase() ?? "");
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
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const emailRedirectTo = inviteToken
        ? `${origin}${afterAuthPath}${afterAuthPath.includes("?") ? "&" : "?"}welcome=1`
        : `${origin}/home`;
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
          inviteToken
            ? "Compte créé. Confirmez votre email : le lien vous ramènera directement au projet."
            : "Compte créé. Un email de confirmation vient d'être envoyé. Cliquez sur le lien reçu pour activer votre compte."
        );
        return;
      }
      if (inviteToken) {
        const res = await fetch(`/api/invitations/${inviteToken}`, { method: "POST" });
        const payload = await res.json();
        if (res.ok && payload.projectId) {
          router.replace(`/projects/${payload.projectId}`);
          router.refresh();
          return;
        }
        router.replace(afterAuthPath);
        return;
      }
      router.replace("/home");
    } catch {
      setMessage("Erreur technique. Réessayez dans quelques instants.");
    } finally {
      setLoading(false);
    }
  };

  const loginHref = `/login${afterAuthPath !== "/home" ? `?redirect=${encodeURIComponent(afterAuthPath)}` : ""}`;

  return (
    <AuthShell
      title="Créer un compte"
      subtitle={
        inviteToken
          ? "Votre espace Personnel sera créé automatiquement. Vous rejoindrez ensuite uniquement le projet invité."
          : brand.tagline
      }
      footer={
        <>
          Déjà un compte ?{" "}
          <Link href={loginHref} className="font-semibold text-wo-accent hover:underline">
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
          <p className="rounded-xl border border-wo-border bg-wo-hover px-3 py-2 text-xs text-wo-secondary">
            {message}
          </p>
        ) : null}
        <button type="submit" className={`${ui.btnPrimary} w-full`} disabled={loading}>
          {loading ? "Création…" : inviteToken ? "Créer mon compte et rejoindre" : "Créer mon compte"}
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
          <p className="text-sm text-wo-dim">Chargement…</p>
        </AuthShell>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
