export type ProspectContact = {
  id: string;
  user_id: string;
  prospect_id: string;
  first_name: string;
  last_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export type ProspectContactInput = {
  first_name: string;
  last_name?: string | null;
  job_title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  is_primary?: boolean;
};

export function contactDisplayName(c: Pick<ProspectContact, "first_name" | "last_name">): string {
  return [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || "Sans nom";
}
