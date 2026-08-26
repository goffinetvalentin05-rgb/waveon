import { isInvitableRole, isProjectRole, type InvitableRole, type ProjectRole } from "@/lib/access/roles";

export type ProjectMemberRow = {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  email: string | null;
  display_name: string | null;
  created_at: string;
};

export type ProjectInvitationRow = {
  id: string;
  project_id: string;
  email: string | null;
  token: string;
  role: InvitableRole;
  created_by: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export function parseMemberRole(value: unknown): ProjectRole | null {
  return isProjectRole(value) ? value : null;
}

export function parseInviteRole(value: unknown): InvitableRole | null {
  return isInvitableRole(value) ? value : null;
}
