-- Logo projet (avatar). Les couleurs restent optionnelles en base,
-- l’UI n’expose plus de palette : WaveOne indigo par défaut.
alter table public.projects
  add column if not exists logo_url text;
