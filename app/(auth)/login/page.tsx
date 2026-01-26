"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const supabaseClient = supabase;
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const title = useMemo(
    () => (mode === "login" ? "Connexion" : "Créer un compte"),
    [mode]
  );

  useEffect(() => {
    if (!supabaseClient) return;
    const checkSession = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (data.session) {
        router.replace("/dashboard");
      }
    };
    checkSession();
  }, [router, supabaseClient]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabaseClient) {
      setMessage("Supabase n’est pas encore configuré.");
      return;
    }
    setLoading(true);
    setMessage(null);

    if (mode === "register") {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      if (data.user) {
        await supabaseClient.from("users").insert({
          id: data.user.id,
          email: data.user.email,
        });
      }
      setMessage(
        "Compte créé. Vérifie tes emails si la confirmation est activée."
      );
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      if (data.user) {
        await supabaseClient.from("users").upsert({
          id: data.user.id,
          email: data.user.email,
        });
      }
      router.replace("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Waveon
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
              {title}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Accède à ton dashboard et lance ta campagne en quelques minutes.
            </p>
            {!supabaseClient ? (
              <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
                Supabase n’est pas encore configuré.
              </p>
            ) : null}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Email
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-zinc-400 focus:outline-none"
                type="email"
                placeholder="email@commerce.fr"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={!supabaseClient}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Mot de passe
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm focus:border-zinc-400 focus:outline-none"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={!supabaseClient}
              />
            </div>
            {message ? (
              <p className="rounded-xl bg-zinc-100 px-4 py-3 text-xs text-zinc-600">
                {message}
              </p>
            ) : null}
            <button
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
              type="submit"
              disabled={loading || !supabaseClient}
            >
              {loading ? "Chargement..." : title}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-500">
            {mode === "login" ? (
              <>
                Pas encore de compte ?{" "}
                <button
                  className="font-semibold text-zinc-900"
                  type="button"
                  onClick={() => setMode("register")}
                >
                  S’inscrire
                </button>
              </>
            ) : (
              <>
                Déjà un compte ?{" "}
                <button
                  className="font-semibold text-zinc-900"
                  type="button"
                  onClick={() => setMode("login")}
                >
                  Se connecter
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

