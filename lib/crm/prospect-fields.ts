import { CONTACT_CHANNELS, type Prospect } from "@/lib/crm/types";

/** Priorités alignées sur la contrainte DB `prospects_priority_check`. */
export const PROSPECT_PRIORITIES = ["Faible", "Normale", "Haute", "Urgente"] as const;
export type ProspectPriority = (typeof PROSPECT_PRIORITIES)[number];

export { CONTACT_CHANNELS };

/**
 * Champs métier partagés création + édition fiche.
 * Exclut volontairement les champs techniques / système
 * (id, user_id, project_id, status, timestamps, archive, etc.).
 */
export type ProspectBusinessFormValues = {
  club_name: string;
  sport: string;
  canton: string;
  ville: string;
  country: string;
  address: string;
  contact_name: string;
  contact_function: string;
  phone: string;
  email: string;
  website: string;
  linkedin_url: string;
  source: string;
  priority: ProspectPriority;
  potential_value: string;
  contact_channel: string;
  tags: string;
  logo_url: string;
};

export const EMPTY_PROSPECT_BUSINESS_FORM: ProspectBusinessFormValues = {
  club_name: "",
  sport: "",
  canton: "",
  ville: "",
  country: "",
  address: "",
  contact_name: "",
  contact_function: "",
  phone: "",
  email: "",
  website: "",
  linkedin_url: "",
  source: "",
  priority: "Normale",
  potential_value: "",
  contact_channel: "",
  tags: "",
  logo_url: "",
};

export function prospectToBusinessForm(
  prospect: Pick<
    Prospect,
    | "club_name"
    | "sport"
    | "canton"
    | "ville"
    | "country"
    | "address"
    | "contact_name"
    | "contact_function"
    | "phone"
    | "email"
    | "website"
    | "linkedin_url"
    | "source"
    | "priority"
    | "potential_value"
    | "contact_channel"
    | "tags"
    | "logo_url"
  >
): ProspectBusinessFormValues {
  return {
    club_name: prospect.club_name ?? "",
    sport: prospect.sport ?? "",
    canton: prospect.canton ?? "",
    ville: prospect.ville ?? "",
    country: prospect.country ?? "",
    address: prospect.address ?? "",
    contact_name: prospect.contact_name ?? "",
    contact_function: prospect.contact_function ?? "",
    phone: prospect.phone ?? "",
    email: prospect.email ?? "",
    website: prospect.website ?? "",
    linkedin_url: prospect.linkedin_url ?? "",
    source: prospect.source ?? "",
    priority: (prospect.priority as ProspectPriority | null | undefined) ?? "Normale",
    potential_value: prospect.potential_value != null ? String(prospect.potential_value) : "",
    contact_channel: prospect.contact_channel ?? "",
    tags: (prospect.tags ?? []).join(", "),
    logo_url: prospect.logo_url ?? "",
  };
}

/** Payload API (création FormData ou édition PATCH) à partir des valeurs formulaire. */
export function businessFormToApiPayload(values: ProspectBusinessFormValues) {
  return {
    club_name: values.club_name,
    sport: values.sport,
    canton: values.canton,
    ville: values.ville,
    country: values.country,
    address: values.address,
    contact_name: values.contact_name,
    contact_function: values.contact_function,
    phone: values.phone,
    email: values.email,
    website: values.website,
    linkedin_url: values.linkedin_url,
    source: values.source,
    priority: values.priority || "Normale",
    potential_value: values.potential_value === "" ? null : Number(values.potential_value),
    contact_channel: values.contact_channel,
    tags: values.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    logo_url: values.logo_url,
  };
}

export function splitContactName(fullName: string | null | undefined): {
  first_name: string;
  last_name: string | null;
} {
  const parts = String(fullName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { first_name: "Contact", last_name: null };
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" ") || null,
  };
}
