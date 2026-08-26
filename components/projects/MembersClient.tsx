"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/design/tokens";
import {
  INVITABLE_ROLES,
  PROJECT_ROLE_HINTS,
  PROJECT_ROLE_LABELS,
  type InvitableRole,
  type ProjectRole,
} from "@/lib/access/roles";
import { can, canLeaveProject, canManageMember } from "@/lib/access/permissions";
import type { ProjectInvitationRow, ProjectMemberRow } from "@/lib/projects/members";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function inviteUrl(token: string) {
  if (typeof window === "undefined") return `/invite/${token}`;
  return `${window.location.origin}/invite/${token}`;
}

export function MembersClient({
  projectId,
  projectName,
  joinCode,
  myRole,
  currentUserId,
  members,
  invitations,
}: {
  projectId: string;
  projectName: string;
  joinCode: string | null;
  myRole: ProjectRole;
  currentUserId: string;
  members: ProjectMemberRow[];
  invitations: ProjectInvitationRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("member");
  const [mode, setMode] = useState<"email" | "link" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [code, setCode] = useState(joinCode);
  const [copied, setCopied] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ProjectMemberRow | null>(null);
  const canInvite = can(myRole, "members.invite");
  const canLeave = canLeaveProject(myRole);

  const pending = useMemo(
    () => invitations.filter((i) => !i.accepted_at && !i.revoked_at && new Date(i.expires_at) > new Date()),
    [invitations]
  );

  const copyText = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1600);
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
    setCreatedLink(null);
    setEmailSent(null);
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
    setEmailSent(typeof data.emailSent === "boolean" ? data.emailSent : null);
    router.refresh();
  };

  const patchInvite = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/projects/${projectId}/invitations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const data = await res.json();
    if (body.resend && data.url) {
      await copyText(data.url, id);
    }
    router.refresh();
    return data;
  };

  const changeRole = async (userId: string, nextRole: InvitableRole) => {
    await fetch(`/api/projects/${projectId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    router.refresh();
  };

  const removeMember = async (userId: string) => {
    const res = await fetch(`/api/projects/${projectId}/members/${userId}`, { method: "DELETE" });
    if (res.ok && userId === currentUserId) {
      router.push("/projects");
    }
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canLeave ? (
          <button
            type="button"
            className={ui.btnSecondary}
            onClick={() => setRemoveTarget(members.find((m) => m.user_id === currentUserId) ?? null)}
          >
            Quitter le projet
          </button>
        ) : null}
        {canInvite ? (
          <button
            type="button"
            className={ui.btnPrimary}
            onClick={() => {
              setOpen(true);
              setCreatedLink(null);
              setEmailSent(null);
              setError(null);
            }}
          >
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
          <button
            type="button"
            className={ui.btnSecondary}
            onClick={() => void copyText(code ?? "", "code")}
            disabled={!code}
          >
            {copied === "code" ? "Copié" : "Copier"}
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
          {members.map((member) => {
            const name = member.display_name || member.email || "Membre";
            const isYou = member.user_id === currentUserId;
            const manageable = canManageMember(myRole, member.role);
            return (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                    {initials(name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-wo-text">
                      {name}
                      {isYou ? <span className="ml-1.5 text-[11px] font-normal text-wo-muted">vous</span> : null}
                    </p>
                    <p className="truncate text-[12px] text-wo-muted">{member.email || "Email non renseigné"}</p>
                    <p className="text-[11px] text-wo-dim">
                      Arrivé le {new Date(member.created_at).toLocaleDateString("fr-CH")} · Actif
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {manageable ? (
                    <select
                      className={`${ui.input} w-auto py-1.5 text-sm`}
                      value={member.role}
                      onChange={(e) => void changeRole(member.user_id, e.target.value as InvitableRole)}
                    >
                      {INVITABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {PROJECT_ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
                      {PROJECT_ROLE_LABELS[member.role]}
                    </span>
                  )}
                  {manageable ? (
                    <button type="button" className={ui.btnGhost} onClick={() => setRemoveTarget(member)}>
                      Retirer
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={`${ui.widget} p-5 sm:p-6`}>
        <h2 className={ui.h2}>Invitations en attente</h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-wo-muted">Aucune invitation active.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pending.map((invite) => {
              const url = inviteUrl(invite.token);
              return (
                <li
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-wo-border px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-wo-text">{invite.email || "Lien d'invitation"}</p>
                    <p className="text-[12px] text-wo-muted">
                      {PROJECT_ROLE_LABELS[invite.role]} · envoyé par {invite.inviter_name || "un membre"} ·{" "}
                      {new Date(invite.created_at).toLocaleDateString("fr-CH")} · expire le{" "}
                      {new Date(invite.expires_at).toLocaleDateString("fr-CH")}
                    </p>
                    <p className="mt-1 truncate font-mono text-[11px] text-wo-dim">{url}</p>
                  </div>
                  {canInvite ? (
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        className={ui.btnGhost}
                        onClick={() => void copyText(url, invite.id)}
                      >
                        {copied === invite.id ? "Copié" : "Copier le lien"}
                      </button>
                      <button
                        type="button"
                        className={ui.btnGhost}
                        onClick={() => void patchInvite(invite.id, { resend: true })}
                      >
                        Renvoyer
                      </button>
                      <button
                        type="button"
                        className={ui.btnGhost}
                        onClick={() => void patchInvite(invite.id, { revoke: true })}
                      >
                        Annuler
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
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
              {(["email", "link", "code"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setMode(item);
                    setCreatedLink(null);
                    setEmailSent(null);
                  }}
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
                <button
                  type="button"
                  className={ui.btnSecondary}
                  onClick={() => void copyText(code ?? "", "modal-code")}
                  disabled={!code}
                >
                  {copied === "modal-code" ? "Copié" : "Copier le code"}
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
              <div className="mt-4 space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-wo-dim">Lien d&apos;invitation</p>
                <p className={`${ui.alertInfo} break-all text-xs`}>{createdLink}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-wo-muted">
                  <span>Expiration : 7 jours</span>
                  <span>·</span>
                  <span>Rôle : {PROJECT_ROLE_LABELS[role]}</span>
                </div>
                <button
                  type="button"
                  className={ui.btnSecondary}
                  onClick={() => void copyText(createdLink, "created")}
                >
                  {copied === "created" ? "Copié" : "Copier le lien"}
                </button>
                {mode === "email" ? (
                  <p className="text-xs text-wo-muted">
                    {emailSent
                      ? "Un email a été envoyé."
                      : "Email non configuré — copiez le lien et envoyez-le vous-même."}
                  </p>
                ) : null}
              </div>
            ) : null}
            {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className={ui.btnSecondary} onClick={() => setOpen(false)}>
                Fermer
              </button>
              {mode !== "code" ? (
                <button type="submit" className={ui.btnPrimary} disabled={loading}>
                  {loading ? "Création…" : mode === "link" ? "Générer le lien" : "Envoyer l'invitation"}
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(removeTarget)}
        title={
          removeTarget?.user_id === currentUserId
            ? `Quitter ${projectName} ?`
            : `Retirer ${removeTarget?.display_name || removeTarget?.email || "ce membre"} ?`
        }
        description={
          removeTarget?.user_id === currentUserId
            ? "Vous perdrez l'accès à ce projet uniquement. Votre compte et votre espace Personnel restent intacts."
            : "Cette personne perd l'accès à ce projet uniquement. Son compte WaveOne et son espace Personnel restent intacts."
        }
        tone="danger"
        confirmLabel={removeTarget?.user_id === currentUserId ? "Quitter" : "Retirer"}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={async () => {
          if (!removeTarget) return;
          await removeMember(removeTarget.user_id);
          setRemoveTarget(null);
        }}
      />
    </div>
  );
}
