"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/design/tokens";
import { INVITABLE_ROLES, PROJECT_ROLE_HINTS, PROJECT_ROLE_LABELS, type InvitableRole } from "@/lib/access/roles";
import { can } from "@/lib/access/permissions";
import type { ProjectRole } from "@/lib/access/roles";
import type { ProjectInvitationRow, ProjectMemberRow } from "@/lib/projects/members";

export function MembersClient({
  projectId,
  projectName,
  joinCode,
  myRole,
  members,
  invitations,
}: {
  projectId: string;
  projectName: string;
  joinCode: string | null;
  myRole: ProjectRole;
  members: ProjectMemberRow[];
  invitations: ProjectInvitationRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("member");
  const [mode, setMode] = useState<"email" | "link" | "code">("link");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [code, setCode] = useState(joinCode);
  const [copied, setCopied] = useState(false);
  const canInvite = can(myRole, "members.invite");

  const pending = useMemo(
    () => invitations.filter((i) => !i.accepted_at && !i.revoked_at && new Date(i.expires_at) > new Date()),
    [invitations]
  );

  const copyCode = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const regenerate = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/join-code`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Impossible de régénérer le code");
      return;
    }
    setCode(data.join_code ?? null);
    router.refresh();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "code") return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        email: mode === "email" ? email.trim() : null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Impossible de créer l'invitation");
      return;
    }
    setCreatedLink(data.url ?? null);
    router.refresh();
  };

  const revoke = async (id: string) => {
    await fetch(`/api/projects/${projectId}/invitations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, revoke: true }),
    });
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canInvite ? (
          <button type="button" className={ui.btnPrimary} onClick={() => setOpen(true)}>
            Inviter un membre
          </button>
        ) : null}
      </div>

      <section className={`${ui.widget} p-5 sm:p-6`}>
        <h2 className={ui.h2}>Code du projet</h2>
        <p className="mt-1 text-sm text-wo-muted">
          Ce code ne donne accès qu&apos;à {projectName}. Pas à votre espace Personnel, ni aux autres projets.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="rounded-xl border border-wo-border bg-slate-50 px-3 py-2 font-mono text-sm tracking-wide text-wo-text">
            {code || "—"}
          </code>
          <button type="button" className={ui.btnSecondary} onClick={() => void copyCode()} disabled={!code}>
            {copied ? "Copié" : "Copier"}
          </button>
          {canInvite ? (
            <button type="button" className={ui.btnGhost} onClick={() => void regenerate()} disabled={loading}>
              Régénérer
            </button>
          ) : null}
        </div>
      </section>

      <section className={`${ui.widget} p-5 sm:p-6`}>
        <h2 className={ui.h2}>Membres de {projectName}</h2>
        <p className="mt-1 text-sm text-wo-muted">
          L&apos;accès est limité à ce projet. Personne ici ne voit votre espace Personnel ni vos autres projets.
        </p>
        <ul className="mt-5 divide-y divide-[color:var(--wo-border)]">
          {members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-wo-text">
                  {member.display_name || member.email || "Membre"}
                </p>
                <p className="truncate text-[12px] text-wo-muted">{member.email || "Email non renseigné"}</p>
              </div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
                {PROJECT_ROLE_LABELS[member.role]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${ui.widget} p-5 sm:p-6`}>
        <h2 className={ui.h2}>Invitations en attente</h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-wo-muted">Aucune invitation active.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pending.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-wo-border px-3 py-3">
                <div>
                  <p className="text-sm text-wo-text">{invite.email || "Lien d'invitation"}</p>
                  <p className="text-[12px] text-wo-muted">
                    {PROJECT_ROLE_LABELS[invite.role]} · expire le{" "}
                    {new Date(invite.expires_at).toLocaleDateString("fr-CH")}
                  </p>
                </div>
                {canInvite ? (
                  <button type="button" className={ui.btnGhost} onClick={() => void revoke(invite.id)}>
                    Révoquer
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className={ui.overlay} onClick={() => setOpen(false)} aria-label="Fermer" />
          <form onSubmit={submit} className={`${ui.modal} max-w-md p-6`}>
            <h2 className="text-lg font-semibold text-wo-text">Inviter dans {projectName}</h2>
            <p className="mt-1 text-sm text-wo-muted">L&apos;invitation ne donne accès qu&apos;à ce projet.</p>
            <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-1">
              {(["link", "email", "code"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={`rounded-lg px-2 py-1.5 text-sm font-medium ${
                    mode === item ? "bg-white text-wo-text shadow-sm" : "text-wo-muted"
                  }`}
                >
                  {item === "link" ? "Lien" : item === "email" ? "Email" : "Code"}
                </button>
              ))}
            </div>
            {mode === "email" ? (
              <div className="mt-4">
                <label className={ui.label}>Email</label>
                <input
                  type="email"
                  className={ui.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="prenom@email.com"
                />
              </div>
            ) : null}
            {mode === "code" ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-wo-muted">Partagez ce code. La personne rejoint uniquement {projectName}.</p>
                <code className="block rounded-xl border border-wo-border bg-slate-50 px-3 py-2 font-mono text-sm">
                  {code || "—"}
                </code>
                <button type="button" className={ui.btnSecondary} onClick={() => void copyCode()} disabled={!code}>
                  {copied ? "Copié" : "Copier le code"}
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <label className={ui.label}>Rôle</label>
                <select className={ui.input} value={role} onChange={(e) => setRole(e.target.value as InvitableRole)}>
                  {INVITABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {PROJECT_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[12px] text-wo-muted">{PROJECT_ROLE_HINTS[role]}</p>
              </div>
            )}
            {createdLink ? (
              <div className={`${ui.alertSuccess} mt-4 break-all text-xs`}>{createdLink}</div>
            ) : null}
            {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className={ui.btnSecondary} onClick={() => setOpen(false)}>
                Fermer
              </button>
              {mode !== "code" ? (
                <button type="submit" className={ui.btnPrimary} disabled={loading}>
                  {loading ? "Création…" : mode === "link" ? "Générer le lien" : "Créer l'invitation"}
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
