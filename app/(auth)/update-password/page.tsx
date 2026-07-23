"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { ui } from "@/lib/design/tokens";
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
    const read = () =>
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!cancelled && session) setHasSession(true);
      });
    read();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(read);
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
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
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.replace("/home");
  };

  if (!hasSession) {
    return (
      <AuthShell
        title="Lien invalide ou expiré"
        subtitle="Ce lien de réinitialisation n'est plus valide. Demande un nouveau lien depuis la page de connexion."
      >
        <Link href="/login" className={`${ui.btnPrimary} w-full justify-center`}>
          Retour à la connexion
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Nouveau mot de passe"
      subtitle="Choisis un mot de passe sécurisé pour ton compte."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className={ui.label} htmlFor="reset-pw">Mot de passe</label>
          <input
            id="reset-pw"
            type="password"
            className={ui.input}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label className={ui.label} htmlFor="reset-pw2">Confirmer</label>
          <input
            id="reset-pw2"
            type="password"
            className={ui.input}
            placeholder="••••••••"
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
          {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
        </button>
      </form>
    </AuthShell>
  );
}
