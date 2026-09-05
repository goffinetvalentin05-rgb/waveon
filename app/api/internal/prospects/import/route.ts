import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { normalizeClubName } from "@/lib/crm/import-fields";
import {
  buildProspectImportPayload,
  nullIfEmpty,
} from "@/lib/crm/prospect-payload";
import { upsertPrimaryContactFromProspectFields } from "@/lib/crm/sync-primary-contact";
import { logWorkspaceEvent } from "@/lib/workspace/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Projet Obillz — tous les prospects importés via cette API y sont rattachés. */
const OBILLZ_PROJECT_ID = "a7c76717-882f-4316-abb3-930123df0653";
const MAX_BATCH = 200;

type ExternalProspectInput = {
  name?: unknown;
  contact_name?: unknown;
  contact_function?: unknown;
  phone_number?: unknown;
  email?: unknown;
  website?: unknown;
  ville?: unknown;
  notes?: unknown;
  address?: unknown;
  country?: unknown;
  tags?: unknown;
};

type ItemError = {
  index: number;
  name?: string | null;
  message: string;
};

type DuplicateInfo = {
  index: number;
  name: string;
  existing_id: string | null;
  reason: string;
};

function authorize(request: Request): boolean {
  const secret = process.env.PROSPECT_IMPORT_API_KEY?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const apiKey = request.headers.get("x-api-key");
  return apiKey === secret;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseProspectList(body: unknown): ExternalProspectInput[] | null {
  if (Array.isArray(body)) {
    return body as ExternalProspectInput[];
  }
  if (!isPlainObject(body)) return null;

  if (Array.isArray(body.prospects)) {
    return body.prospects as ExternalProspectInput[];
  }
  if (isPlainObject(body.prospect)) {
    return [body.prospect as ExternalProspectInput];
  }
  // Objet prospect unique (champs à la racine)
  if ("name" in body || "contact_name" in body || "email" in body) {
    return [body as ExternalProspectInput];
  }
  return null;
}

function validateEmail(email: string | null): string | null {
  if (!email) return null;
  // Validation basique : présence d'un @ et d'un domaine
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Email invalide.";
  }
  return null;
}

/**
 * POST /api/internal/prospects/import
 * Import machine-to-machine des prospects Obillz (clé API).
 * Auth: Authorization: Bearer PROSPECT_IMPORT_API_KEY ou header X-API-Key.
 */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json(
      { success: false, added: 0, errors: [{ message: "Non autorisé" }] },
      { status: 401 }
    );
  }

  if (!process.env.PROSPECT_IMPORT_API_KEY?.trim()) {
    return NextResponse.json(
      {
        success: false,
        added: 0,
        errors: [{ message: "PROSPECT_IMPORT_API_KEY non configurée." }],
      },
      { status: 500 }
    );
  }

  let admin;
  try {
    admin = createAdminSupabaseClient();
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        added: 0,
        errors: [
          {
            message:
              e instanceof Error ? e.message : "Admin Supabase indisponible",
          },
        ],
      },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        added: 0,
        errors: [{ message: "Corps de requête JSON invalide." }],
      },
      { status: 400 }
    );
  }

  const items = parseProspectList(body);
  if (!items || items.length === 0) {
    return NextResponse.json(
      {
        success: false,
        added: 0,
        errors: [
          {
            message:
              "Fournis un prospect (objet) ou un tableau de prospects (ou { prospects: [...] }).",
          },
        ],
      },
      { status: 400 }
    );
  }

  if (items.length > MAX_BATCH) {
    return NextResponse.json(
      {
        success: false,
        added: 0,
        errors: [
          {
            message: `Maximum ${MAX_BATCH} prospects par requête.`,
          },
        ],
      },
      { status: 400 }
    );
  }

  // user_id est NOT NULL sur prospects — on prend le propriétaire du projet Obillz.
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, user_id, name")
    .eq("id", OBILLZ_PROJECT_ID)
    .maybeSingle();

  if (projectError) {
    return NextResponse.json(
      {
        success: false,
        added: 0,
        errors: [{ message: projectError.message }],
      },
      { status: 500 }
    );
  }

  if (!project?.user_id) {
    return NextResponse.json(
      {
        success: false,
        added: 0,
        errors: [
          {
            message: `Projet Obillz introuvable (${OBILLZ_PROJECT_ID}).`,
          },
        ],
      },
      { status: 500 }
    );
  }

  const ownerUserId = project.user_id as string;

  const { data: existingRaw, error: existingError } = await admin
    .from("prospects")
    .select("id, club_name, name")
    .eq("project_id", OBILLZ_PROJECT_ID);

  if (existingError) {
    return NextResponse.json(
      {
        success: false,
        added: 0,
        errors: [{ message: existingError.message }],
      },
      { status: 500 }
    );
  }

  const existingByName = new Map<string, string>();
  for (const row of existingRaw ?? []) {
    const label = nullIfEmpty(row.club_name) ?? nullIfEmpty(row.name);
    if (!label) continue;
    const key = normalizeClubName(label);
    if (!existingByName.has(key)) {
      existingByName.set(key, row.id as string);
    }
  }

  const errors: ItemError[] = [];
  const duplicates: DuplicateInfo[] = [];
  const toInsert: {
    index: number;
    name: string;
    payload: ReturnType<typeof buildProspectImportPayload>;
    contact: {
      contact_name: string | null;
      contact_function: string | null;
      email: string | null;
      phone: string | null;
    };
  }[] = [];
  const seenInBatch = new Map<string, number>();

  items.forEach((item, index) => {
    if (!isPlainObject(item)) {
      errors.push({ index, message: "Prospect invalide (objet attendu)." });
      return;
    }

    const name = nullIfEmpty(item.name);
    if (!name) {
      errors.push({ index, message: "Le champ « name » est obligatoire." });
      return;
    }

    const email = nullIfEmpty(item.email);
    const emailError = validateEmail(email);
    if (emailError) {
      errors.push({ index, name, message: emailError });
      return;
    }

    const nameKey = normalizeClubName(name);
    const batchDup = seenInBatch.get(nameKey);
    if (batchDup !== undefined) {
      duplicates.push({
        index,
        name,
        existing_id: null,
        reason: `Doublon dans la même requête (déjà présent à l'index ${batchDup}).`,
      });
      return;
    }

    const existingId = existingByName.get(nameKey);
    if (existingId) {
      duplicates.push({
        index,
        name,
        existing_id: existingId,
        reason: "Un prospect avec le même nom existe déjà dans le projet Obillz.",
      });
      return;
    }

    seenInBatch.set(nameKey, index);

    const phone = nullIfEmpty(item.phone_number);
    try {
      const payload = buildProspectImportPayload(ownerUserId, {
        club_name: name,
        contact_name: item.contact_name,
        contact_function: item.contact_function,
        phone,
        email,
        website: item.website,
        notes: item.notes,
        ville: item.ville,
        address: item.address,
        country: item.country,
        tags: item.tags,
        // Forcé — ignore toute valeur client éventuelle
        project_id: OBILLZ_PROJECT_ID,
      });

      // Garantit status + project même si le payload évolue
      payload.status = "À contacter";
      payload.project_id = OBILLZ_PROJECT_ID;

      toInsert.push({
        index,
        name,
        payload,
        contact: {
          contact_name: nullIfEmpty(item.contact_name),
          contact_function: nullIfEmpty(item.contact_function),
          email,
          phone,
        },
      });
    } catch (e) {
      errors.push({
        index,
        name,
        message: e instanceof Error ? e.message : "Données invalides",
      });
    }
  });

  let added = 0;
  const created: { id: string; name: string; index: number }[] = [];

  if (toInsert.length > 0) {
    const { data: inserted, error: insertError } = await admin
      .from("prospects")
      .insert(toInsert.map((t) => t.payload))
      .select("id, club_name, name");

    if (insertError) {
      return NextResponse.json(
        {
          success: false,
          added: 0,
          duplicates,
          errors: [
            ...errors,
            { message: `Erreur d'insertion : ${insertError.message}` },
          ],
        },
        { status: 500 }
      );
    }

    const rows = inserted ?? [];
    added = rows.length;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const meta = toInsert[i];
      if (!row || !meta) continue;

      const displayName =
        nullIfEmpty(row.club_name) ?? nullIfEmpty(row.name) ?? meta.name;
      created.push({ id: row.id as string, name: displayName, index: meta.index });

      await admin.from("prospect_activities").insert({
        user_id: ownerUserId,
        prospect_id: row.id,
        action_type: "imported",
        title: "Prospect importé (API)",
      });

      await upsertPrimaryContactFromProspectFields(admin, {
        userId: ownerUserId,
        prospectId: row.id as string,
        fields: meta.contact,
      });

      await logWorkspaceEvent(admin, ownerUserId, {
        event_type: "prospect_created",
        title: `Prospect importé (API) : ${displayName}`,
        project_id: OBILLZ_PROJECT_ID,
        entity_type: "prospect",
        entity_id: row.id as string,
      });
    }
  }

  const success = errors.length === 0;

  return NextResponse.json(
    {
      success,
      added,
      duplicates,
      errors,
      prospects: created,
      project_id: OBILLZ_PROJECT_ID,
    },
    { status: success ? (added > 0 ? 201 : 200) : added > 0 ? 207 : 400 }
  );
}
