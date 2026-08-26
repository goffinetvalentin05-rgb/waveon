"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { ui } from "@/lib/design/tokens";
import { PROJECT_ROLE_LABELS, type ProjectRole } from "@/lib/access/roles";

export function AcceptInviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{
    role: string;
    email: string | null;
    accepted: boolean;
    revoked: boolean;
    project: { id: string; name: string; icon: string | null; color: string | null } | null;
  } | null>(null);

  useEffect(() => {
    void fetch(`/api/invitations/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Invitation introuvable");
        setInvite(data.invitation);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    setError(null);
    const res = await fetch(`/api/invitations/${token}`, { method: "POST" });
    const data = await res.json();
    setAccepting(false);
    if (!res.ok) {
      setError(data.error ?? "Impossible de rejoindre le projet");
      return;
    }
    router.replace(`/projects/${data.projectId}`);
    router.refresh();
  };

  if (loading) {
    return (
      <AuthShell title="Invitation" subtitle="Vérification du lien…">
        <p className="text-sm text-wo-muted">Chargement.</p>
      </AuthShell>
    );
  }

  if (error && !invite) {
    return (
      <AuthShell title="Invitation invalide" subtitle={error}>
        <Link href="/home" className={ui.btnSecondary}>
          Retour à l&apos;accueil
        </Link>
      </AuthShell>
    );
  }

  const role = (invite?.role ?? "member") as ProjectRole;
  const projectName = invite?.project?.name ?? "ce projet";

  return (
    <AuthShell
      title={`Rejoindre ${projectName}`}
      subtitle="Vous n'aurez accès qu'à ce projet — pas à l'espace personnel du propriétaire, ni à ses autres projets."
    >
      <div className="space-y-4">
        <p className="text-sm text-wo-secondary">
          Rôle proposé : <span className="font-medium text-wo-text">{PROJECT_ROLE_LABELS[role] ?? role}</span>
        </p>
        {invite?.email ? (
          <p className="text-sm text-wo-muted">Invitation destinée à {invite.email}.</p>
        ) : (
          <p className="text-sm text-wo-muted">Invitation par lien, limitée à ce projet.</p>
        )}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <button type="button" className={`${ui.btnPrimary} w-full`} onClick={accept} disabled={accepting}>
          {accepting ? "Admission…" : "Rejoindre le projet"}
        </button>
        <Link href="/home" className="block text-center text-sm text-wo-muted hover:text-wo-text">
          Annuler
        </Link>
      </div>
    </AuthShell>
  );
}
