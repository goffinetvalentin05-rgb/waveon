import type { SupabaseClient } from "@supabase/supabase-js";
import { nullIfEmpty } from "@/lib/crm/prospect-payload";
import { contactDisplayName } from "@/lib/crm/contacts";
import { splitContactName } from "@/lib/crm/prospect-fields";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;

export type PrimaryContactFields = {
  contact_name?: string | null;
  contact_function?: string | null;
  email?: string | null;
  phone?: string | null;
};

function hasContactSignal(fields: PrimaryContactFields): boolean {
  return Boolean(
    nullIfEmpty(fields.contact_name) ||
      nullIfEmpty(fields.contact_function) ||
      nullIfEmpty(fields.email) ||
      nullIfEmpty(fields.phone)
  );
}

/** Recopie le contact principal vers les colonnes dénormalisées du prospect. */
export async function syncPrimaryOntoProspect(supabase: Db, prospectId: string) {
  const { data: primary } = await supabase
    .from("prospect_contacts")
    .select("*")
    .eq("prospect_id", prospectId)
    .eq("is_primary", true)
    .maybeSingle();

  const patch = primary
    ? {
        contact_name: contactDisplayName(primary),
        contact_function: primary.job_title,
        email: primary.email,
        phone: primary.phone,
        phone_number: primary.phone,
      }
    : {};

  if (Object.keys(patch).length) {
    await supabase.from("prospects").update(patch).eq("id", prospectId);
  }
}

/**
 * Crée ou met à jour le contact principal à partir des champs contact du prospect.
 * Évite de créer un second contact si un principal existe déjà.
 */
export async function upsertPrimaryContactFromProspectFields(
  supabase: Db,
  params: {
    userId: string;
    prospectId: string;
    fields: PrimaryContactFields;
  }
) {
  const { userId, prospectId, fields } = params;
  if (!hasContactSignal(fields)) return;

  const { data: primary } = await supabase
    .from("prospect_contacts")
    .select("id")
    .eq("prospect_id", prospectId)
    .eq("is_primary", true)
    .maybeSingle();

  const { first_name, last_name } = splitContactName(fields.contact_name);
  const row = {
    first_name: nullIfEmpty(fields.contact_name) ? first_name : "Contact",
    last_name: nullIfEmpty(fields.contact_name) ? last_name : null,
    job_title: nullIfEmpty(fields.contact_function),
    email: nullIfEmpty(fields.email),
    phone: nullIfEmpty(fields.phone),
    updated_at: new Date().toISOString(),
  };

  if (primary?.id) {
    await supabase.from("prospect_contacts").update(row).eq("id", primary.id).eq("prospect_id", prospectId);
    return;
  }

  const { data: anyContact } = await supabase
    .from("prospect_contacts")
    .select("id")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (anyContact?.id) {
    await supabase
      .from("prospect_contacts")
      .update({ ...row, is_primary: true })
      .eq("id", anyContact.id)
      .eq("prospect_id", prospectId);
    return;
  }

  await supabase.from("prospect_contacts").insert({
    user_id: userId,
    prospect_id: prospectId,
    ...row,
    is_primary: true,
  });
}
