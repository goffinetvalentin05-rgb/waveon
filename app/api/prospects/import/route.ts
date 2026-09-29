import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import type { DuplicateStrategy, ImportProspectRow } from "@/lib/crm/import-fields";
import {
  buildImportPlan,
  countImportActions,
  promoteUnplacedDuplicates,
  type ExistingProspectKeys,
} from "@/lib/crm/import-duplicates";
import { buildProspectFields, buildProspectImportPayload } from "@/lib/crm/prospect-payload";
import {
  attachImportedProspectsWithoutStage,
  prospectNeedsPipelinePlacement,
  ProspectPlacementError,
  resolveProspectPlacement,
  type ProspectPlacement,
} from "@/lib/crm/prospect-placement";

type ImportBody = {
  rows: ImportProspectRow[];
  duplicateStrategy?: DuplicateStrategy;
  project_id?: unknown;
};

const VALID_STRATEGIES = new Set<DuplicateStrategy>([
  "ignore",
  "import_anyway",
  "update",
]);

function applyPlacement(
  payload: Record<string, unknown>,
  placement: ProspectPlacement
) {
  payload.project_id = placement.projectId;
  payload.status = placement.status;
  if (!payload.next_action) payload.next_action = "Premier contact";
  return payload;
}

function prospectPayload(
  userId: string,
  row: ImportProspectRow,
  placement: ProspectPlacement,
  existing?: ExistingProspectKeys,
  isUpdate = false
) {
  if (isUpdate) {
    const fields = buildProspectFields({ ...row, project_id: placement.projectId }) as Record<
      string,
      unknown
    >;
    if (!existing || prospectNeedsPipelinePlacement(existing)) {
      applyPlacement(fields, placement);
    } else {
      fields.project_id = existing.project_id ?? placement.projectId;
    }
    return fields;
  }
  return applyPlacement(
    buildProspectImportPayload(userId, { ...row, project_id: placement.projectId }) as Record<
      string,
      unknown
    >,
    placement
  );
}

async function resolveImportPlacement(
  supabase: Parameters<typeof resolveProspectPlacement>[0],
  userId: string,
  projectId: unknown
) {
  return resolveProspectPlacement(supabase, userId, projectId, { requireProject: true });
}

/** POST /api/prospects/import — importe les prospects mappés. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  let body: ImportBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  let placement: ProspectPlacement;
  try {
    placement = await resolveImportPlacement(supabase, user.id, body.project_id);
  } catch (error) {
    const message =
      error instanceof ProspectPlacementError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Aucun stage « À contacter » n’a été trouvé pour ce projet. L’import a été annulé.';
    return NextResponse.json({ error: message, success: false }, { status: 400 });
  }

  const rows = body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Aucune ligne à importer." }, { status: 400 });
  }

  const strategy: DuplicateStrategy = VALID_STRATEGIES.has(body.duplicateStrategy as DuplicateStrategy)
    ? (body.duplicateStrategy as DuplicateStrategy)
    : "ignore";

  const validRows = rows.filter((r) => r?.club_name?.trim());
  if (validRows.length === 0) {
    return NextResponse.json(
      { error: "Colonne « Nom / entreprise » absente ou aucune ligne valide." },
      { status: 400 }
    );
  }

  const { data: existingRaw, error: fetchError } = await supabase
    .from("prospects")
    .select("id, club_name, email, phone, phone_number, status, project_id")
    .eq("user_id", user.id);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const existing = (existingRaw ?? []) as ExistingProspectKeys[];
  const { plan: rawPlan, invalidRows } = buildImportPlan(validRows, existing, strategy);
  const plan = promoteUnplacedDuplicates(rawPlan, existing);
  const counts = countImportActions(plan);

  let imported = 0;
  let updated = 0;
  let skipped = counts.skip + invalidRows.length;
  const errors: string[] = invalidRows.map((i) => `Ligne ${i + 2} : nom / entreprise manquant.`);

  const toCreate = plan.filter((p) => p.action === "create");
  const toUpdate = plan.filter((p) => p.action === "update");

  if (toCreate.length > 0) {
    const payload = toCreate.map((p) => prospectPayload(user.id, p.row, placement));
    const { data: created, error: createError } = await supabase
      .from("prospects")
      .insert(payload)
      .select("id, club_name, project_id, status");

    if (createError) {
      return NextResponse.json(
        { error: `Erreur lors de l'enregistrement : ${createError.message}`, errors, success: false },
        { status: 500 }
      );
    }

    imported = created?.length ?? 0;

    if (created?.length) {
      await supabase.from("prospect_activities").insert(
        created.map((p) => ({
          user_id: user.id,
          prospect_id: p.id,
          action_type: "imported",
          title: "Prospect importé",
        }))
      );
    }
  }

  for (const item of toUpdate) {
    if (!item.existingId) continue;
    const current = existing.find((row) => row.id === item.existingId);
    const { error: updateError } = await supabase
      .from("prospects")
      .update(prospectPayload(user.id, item.row, placement, current, true))
      .eq("id", item.existingId)
      .eq("user_id", user.id);

    if (updateError) {
      errors.push(`${item.row.club_name} : ${updateError.message}`);
      skipped += 1;
      continue;
    }

    await supabase.from("prospect_activities").insert({
      user_id: user.id,
      prospect_id: item.existingId,
      action_type: "imported",
      title: "Prospect mis à jour (import)",
    });
    updated += 1;
  }

  const repaired = await attachImportedProspectsWithoutStage(supabase, user.id, placement);
  updated += repaired;

  return NextResponse.json({
    imported,
    updated,
    skipped,
    total: imported + updated,
    errors,
    success: true,
    project_id: placement.projectId,
    status: placement.status,
  });
}

/** PUT preview — compte les actions sans persister. */
export async function PUT(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  let body: ImportBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  try {
    await resolveImportPlacement(supabase, user.id, body.project_id);
  } catch (error) {
    const message =
      error instanceof ProspectPlacementError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Aucun stage « À contacter » n’a été trouvé pour ce projet. L’import a été annulé.';
    return NextResponse.json({ error: message, success: false }, { status: 400 });
  }

  const rows = body.rows ?? [];
  const strategy: DuplicateStrategy = VALID_STRATEGIES.has(body.duplicateStrategy as DuplicateStrategy)
    ? (body.duplicateStrategy as DuplicateStrategy)
    : "ignore";

  const validRows = rows.filter((r) => r?.club_name?.trim());
  const invalidCount = rows.length - validRows.length;

  const { data: existingRaw } = await supabase
    .from("prospects")
    .select("id, club_name, email, phone, phone_number, status, project_id")
    .eq("user_id", user.id);

  const existing = (existingRaw ?? []) as ExistingProspectKeys[];
  const { plan: rawPlan } = buildImportPlan(validRows, existing, strategy);
  const plan = promoteUnplacedDuplicates(rawPlan, existing);
  const counts = countImportActions(plan);

  return NextResponse.json({
    willImport: counts.total,
    willCreate: counts.create,
    willUpdate: counts.update,
    willSkip: counts.skip + invalidCount,
    invalidCount,
  });
}
