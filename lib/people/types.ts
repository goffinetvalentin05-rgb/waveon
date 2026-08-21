export type Person = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  role: string | null;
  is_self: boolean;
  created_at: string;
  updated_at: string;
};

export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}
