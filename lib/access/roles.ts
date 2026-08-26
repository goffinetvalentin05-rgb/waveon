export const PROJECT_ROLES = ["owner", "admin", "member", "viewer"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const INVITABLE_ROLES = ["admin", "member", "viewer"] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export const PROJECT_ROLE_HINTS: Record<ProjectRole, string> = {
  owner: "Créateur du projet. Tous les droits.",
  admin: "Gère le projet et invite des membres.",
  member: "Travaille sur le projet, sans les réglages sensibles.",
  viewer: "Consultation uniquement.",
};

export function isProjectRole(value: unknown): value is ProjectRole {
  return typeof value === "string" && PROJECT_ROLES.includes(value as ProjectRole);
}

export function isInvitableRole(value: unknown): value is InvitableRole {
  return typeof value === "string" && INVITABLE_ROLES.includes(value as InvitableRole);
}

export function roleRank(role: ProjectRole): number {
  switch (role) {
    case "owner":
      return 40;
    case "admin":
      return 30;
    case "member":
      return 20;
    case "viewer":
      return 10;
    default:
      return 0;
  }
}

export function atLeast(role: ProjectRole, minimum: ProjectRole): boolean {
  return roleRank(role) >= roleRank(minimum);
}
