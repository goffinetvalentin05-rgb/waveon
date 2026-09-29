import type { SupabaseClient } from "@supabase/supabase-js";
import { requireProjectPermission } from "@/lib/projects/access";
import {
  getInitialPipelineColumn,
  INITIAL_PIPELINE_STATUS,
  type PipelineColumnId,
} from "@/lib/crm/pipeline";
import type { ProspectStatus } from "@/lib/crm/types";

export class ProspectPlacementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProspectPlacementError";
  }
}

export type ProspectPlacement = {
  projectId: string | null;
  status: ProspectStatus;
  stageId: PipelineColumnId;
};

function parseProjectId(value: unknown): string | null {
  if (value == null) return null;
  const id = String(value).trim();
  if (!id || id === "unassigned") return null;
  return id;
}

/**
 * Même placement que « Ajouter un prospect » : projet courant + stage « À contacter ».
 * L’import exige un projet ; la création manuelle hors projet reste possible.
 */
export async function resolveProspectPlacement(
  supabase: SupabaseClient,
  userId: string,
  rawProjectId: unknown,
  options?: { requireProject?: boolean }
): Promise<ProspectPlacement> {
  let stage;
  try {
    stage = getInitialPipelineColumn();
  } catch (error) {
    throw new ProspectPlacementError(
      error instanceof Error
        ? error.message
        : 'Aucun stage « À contacter » n’a été trouvé pour ce projet. L’import a été annulé.'
    );
  }

  const projectId = parseProjectId(rawProjectId);
  if (!projectId) {
    if (options?.requireProject) {
      throw new ProspectPlacementError(
        "Aucun projet sélectionné. Ouvre un projet pour importer des prospects."
      );
    }
    return { projectId: null, status: stage.status, stageId: stage.id };
  }

  const access = await requireProjectPermission(supabase, projectId, userId, "records.create");
  if ("error" in access) {
    throw new ProspectPlacementError(
      access.status === 404
        ? "Projet introuvable. L’import a été annulé."
        : access.error
    );
  }

  return { projectId, status: stage.status, stageId: stage.id };
}

export function prospectNeedsPipelinePlacement(row: {
  status?: string | null;
  project_id?: string | null;
}): boolean {
  const status = (row.status ?? "").trim();
  return !status || !row.project_id;
}

/** Prospects importés récemment, sans projet ou sans stage — à rattacher, pas à recréer. */
export async function attachImportedProspectsWithoutStage(
  supabase: SupabaseClient,
  userId: string,
  placement: ProspectPlacement
): Promise<number> {
  if (!placement.projectId) return 0;

  const { data: ikoneraRows } = await supabase
    .from("projects")
    .select("id")
    .ilike("name", "%ikonera%")
    .limit(1);

  const attachProjectId = ikoneraRows?.[0]?.id ?? placement.projectId;
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("prospects")
    .select("id, status, project_id, last_action, created_at")
    .eq("user_id", userId)
    .is("archived_at", null)
    .gte("created_at", since);

  if (error || !rows?.length) return 0;

  const orphanIds = rows
    .filter((row) => row.last_action === "Importé" && prospectNeedsPipelinePlacement(row))
    .map((row) => row.id as string);

  if (orphanIds.length === 0) return 0;

  const { data: updated, error: updateError } = await supabase
    .from("prospects")
    .update({
      project_id: attachProjectId,
      status: INITIAL_PIPELINE_STATUS,
      next_action: "Premier contact",
    })
    .in("id", orphanIds)
    .eq("user_id", userId)
    .select("id");

  if (updateError) return 0;
  return updated?.length ?? 0;
}

/** Réparation best-effort à l’ouverture du pipeline / de la liste projet. */
export async function repairImportedProspectsForProjectPage(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<void> {
  try {
    const placement = await resolveProspectPlacement(supabase, userId, projectId, {
      requireProject: true,
    });
    await attachImportedProspectsWithoutStage(supabase, userId, placement);
  } catch {
    /* Ne bloque pas l’affichage du pipeline. */
  }
}
