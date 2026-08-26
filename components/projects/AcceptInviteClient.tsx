"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { brand } from "@/lib/brand/config";
import { ui } from "@/lib/design/tokens";
import { invitePath } from "@/lib/auth/invite";
import { PROJECT_ROLE_LABELS, type ProjectRole } from "@/lib/access/roles";

type InvitePayload = {
  role: string;
  email: string | null;
  accepted: boolean;
  revoked: boolean;
  expired: boolean;
  expires_at: string;
  inviterName: string;
  project: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    description?: string | null;
  } | null;
};

export function AcceptInviteClient({
  token,
  signedIn,
  userEmail,
  autoJoin,
}: {
  token: string;
  signedIn: boolean;
  userEmail: string | null;
  autoJoin: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InvitePayload | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invitation introuvable");
      setLoading(false);
      return;
    }
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
    if (!res.ok) {
      setAccepting(false);
      setError(data.error ?? "Impossible de rejoindre le projet");
      return;
    }
    router.replace(`/projects/${data.projectId}`);
    router.refresh();
  };

  useEffect(() => {
    if (!autoJoin || loading || !invite || invite.accepted || invite.revoked || invite.expired) return;
    void accept();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot after load
  }, [autoJoin, loading, invite]);

  const projectName = invite?.project?.name ?? "ce projet";
  const color = invite?.project?.color ?? "#6366F1";
  const role = (invite?.role ?? "member") as ProjectRole;
  const inactive = Boolean(invite?.accepted || invite?.revoked || invite?.expired);
  const emailMismatch =
    Boolean(invite?.email && userEmail && invite.email.toLowerCase() !== userEmail.toLowerCase());

  const signupHref = `/signup?redirect=${encodeURIComponent(invitePath(token))}${
    invite?.email ? `&email=${encodeURIComponent(invite.email)}` : ""
  }`;
  const loginHref = `/login?redirect=${encodeURIComponent(invitePath(token))}${
    invite?.email ? `&email=${encodeURIComponent(invite.email)}` : ""
  }`;

  return (
    <div className="crm-auth-bg relative flex min-h-screen flex-col overflow-hidden">
      <div className="crm-auth-grid absolute inset-0" />
      <header className="relative z-10 px-5 py-6 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="wo-brand-mark h-8 w-8 text-sm">W</span>
          <span className="font-display text-[15px] font-semibold tracking-tight text-wo-text">
            {brand.name}
          </span>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
        <div className="crm-animate-in w-full max-w-[440px]">
          <div className="wo-card p-7 sm:p-9">
            {loading ? (
              <p className="text-sm text-wo-muted">Vérification de l&apos;invitation…</p>
            ) : error && !invite ? (
              <div className="space-y-4">
                <p className={ui.kicker}>Invitation</p>
                <h1 className="font-display text-2xl font-semibold tracking-tight text-wo-text">
                  Lien invalide
                </h1>
                <p className="text-sm text-wo-muted">{error}</p>
                <Link href="/login" className={`${ui.btnSecondary} mt-2 inline-flex`}>
                  Aller à WaveOne
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className={ui.kicker}>Invitation</p>
                  <p className="mt-3 text-sm text-wo-secondary">
                    <span className="font-medium text-wo-text">{invite?.inviterName}</span> vous invite à
                    rejoindre
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <span
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold"
                      style={{ background: `${color}22`, color }}
                    >
                      {invite?.project?.icon || projectName.slice(0, 1).toUpperCase()}
                    </span>
                    <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-wo-text">
                      {projectName}
                    </h1>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-wo-muted">
                    Collaborer sur ce projet dans WaveOne. Vous aurez votre propre espace Personnel — ce
                    lien ne donne accès qu&apos;à {projectName}.
                  </p>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-wo-dim">Rôle</dt>
                    <dd className="mt-0.5 font-medium text-wo-text">{PROJECT_ROLE_LABELS[role] ?? role}</dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-wo-dim">Expiration</dt>
                    <dd className="mt-0.5 font-medium text-wo-text">
                      {invite?.expires_at
                        ? new Date(invite.expires_at).toLocaleDateString("fr-CH")
                        : "7 jours"}
                    </dd>
                  </div>
                </dl>

                {invite?.email ? (
                  <p className="text-xs text-wo-muted">Destinée à {invite.email}.</p>
                ) : null}

                {inactive ? (
                  <p className="text-sm text-wo-muted">
                    {invite?.accepted
                      ? "Cette invitation a déjà été utilisée."
                      : invite?.revoked
                        ? "Cette invitation a été annulée."
                        : "Cette invitation a expiré."}
                  </p>
                ) : null}

                {emailMismatch ? (
                  <p className="text-sm text-rose-600">
                    Connecté en tant que {userEmail}. Cette invitation est destinée à {invite?.email}.
                  </p>
                ) : null}

                {error ? <p className="text-sm text-rose-600">{error}</p> : null}

                {inactive ? (
                  <Link href={signedIn ? "/home" : "/login"} className={`${ui.btnSecondary} w-full justify-center`}>
                    {signedIn ? "Retour à l'accueil" : "Aller à WaveOne"}
                  </Link>
                ) : signedIn ? (
                  <button
                    type="button"
                    className={`${ui.btnPrimary} w-full`}
                    onClick={() => void accept()}
                    disabled={accepting || emailMismatch}
                  >
                    {accepting ? "Admission…" : `Rejoindre ${projectName}`}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <Link href={signupHref} className={`${ui.btnPrimary} w-full justify-center`}>
                      Créer mon compte et rejoindre
                    </Link>
                    <Link href={loginHref} className={`${ui.btnSecondary} w-full justify-center`}>
                      J&apos;ai déjà un compte
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
