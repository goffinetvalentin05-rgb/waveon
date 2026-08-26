import { atLeast, type ProjectRole } from "@/lib/access/roles";

/**
 * Matrice de permissions projet.
 * Les actions avancées peuvent rester inutilisées aujourd'hui :
 * le but est d'avoir une source unique, extensible, côté serveur.
 */
export const PROJECT_PERMISSIONS = [
  "project.view",
  "project.edit_settings",
  "project.manage_modules",
  "project.archive",
  "project.delete",
  "members.view",
  "members.invite",
  "members.manage_roles",
  "members.remove",
  "records.view",
  "records.create",
  "records.edit",
  "records.delete",
  "records.comment",
] as const;

export type ProjectPermission = (typeof PROJECT_PERMISSIONS)[number];

const PERMISSION_MINIMUM: Record<ProjectPermission, ProjectRole> = {
  "project.view": "viewer",
  "project.edit_settings": "admin",
  "project.manage_modules": "admin",
  "project.archive": "owner",
  "project.delete": "owner",
  "members.view": "viewer",
  "members.invite": "admin",
  "members.manage_roles": "admin",
  "members.remove": "admin",
  "records.view": "viewer",
  "records.create": "member",
  "records.edit": "member",
  "records.delete": "member",
  "records.comment": "member",
};

export function can(role: ProjectRole | null | undefined, permission: ProjectPermission): boolean {
  if (!role) return false;
  return atLeast(role, PERMISSION_MINIMUM[permission]);
}

export function canLeaveProject(role: ProjectRole | null | undefined): boolean {
  return Boolean(role) && role !== "owner";
}

/** Qui peut modifier / retirer un autre membre. */
export function canManageMember(
  actor: ProjectRole | null | undefined,
  target: ProjectRole
): boolean {
  if (!actor) return false;
  if (target === "owner") return false;
  if (actor === "owner") return true;
  if (actor === "admin") return target === "member" || target === "viewer";
  return false;
}

export function assertCan(role: ProjectRole | null | undefined, permission: ProjectPermission): boolean {
  return can(role, permission);
}
