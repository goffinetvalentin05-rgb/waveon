export const DATA_SCOPES = ["personal", "project"] as const;
export type DataScope = (typeof DATA_SCOPES)[number];

export function parseScopeInput(body: {
  scope?: unknown;
  project_id?: unknown;
}): { scope: DataScope; project_id: string | null } {
  if (body.scope === "personal") {
    return { scope: "personal", project_id: null };
  }
  const project_id =
    typeof body.project_id === "string" && body.project_id.trim()
      ? body.project_id.trim()
      : null;
  return { scope: "project", project_id };
}

export function contextLabel(input: {
  scope?: string | null;
  projectName?: string | null;
}): string {
  if (input.scope === "personal" || (!input.projectName && input.scope !== "project")) {
    if (input.scope === "personal") return "Personnel";
  }
  if (input.projectName) return input.projectName;
  if (input.scope === "personal") return "Personnel";
  return "Sans projet";
}
