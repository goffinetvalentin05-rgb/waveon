"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { ui } from "@/lib/design/tokens";

export function JoinProjectClient() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/projects/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Code invalide");
      return;
    }
    router.replace(`/projects/${data.projectId}`);
    router.refresh();
  };

  return (
    <AuthShell
      title="Rejoindre un projet"
      subtitle="Entrez le code du projet. Vous n'aurez accès qu'à cet espace — pas au Personnel du propriétaire, ni à ses autres projets."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={ui.label}>Code du projet</label>
          <input
            className={`${ui.input} font-mono uppercase tracking-wide`}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="IKN-4821"
            required
          />
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <button type="submit" className={`${ui.btnPrimary} w-full`} disabled={loading}>
          {loading ? "Vérification…" : "Rejoindre"}
        </button>
      </form>
    </AuthShell>
  );
}
