"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.replace("/onboarding");
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
              <Image
                src="/logo_waevon.png"
                alt="Waevon"
                width={200}
                height={70}
                className="h-10 w-auto"
                priority
              />
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white">Créer mon compte</h1>
            <p className="mt-2 text-sm text-[#555]">
              Lance ton agent Waevon en moins de 10 minutes.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSignup}>
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
                disabled={loading}
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
                minLength={6}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[#888]">
                Confirmer le mot de passe
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-[#333] bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder:text-[#555] focus:border-[#39FF14] focus:outline-none"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
                disabled={loading}
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
              disabled={loading}
            >
              {loading ? "Création en cours..." : "Créer mon compte"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#888]">
            Déjà un compte ?{" "}
            <a href="/login" className="font-semibold text-[#39FF14] hover:underline">
              Se connecter
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
