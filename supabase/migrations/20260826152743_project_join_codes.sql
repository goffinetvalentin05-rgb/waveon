-- Codes de projet partageables (IKN-4821).
-- Additive : aucune donnée existante n'est détruite.

alter table public.projects
  add column if not exists join_code text;

update public.projects
set join_code = upper(left(regexp_replace(coalesce(name, 'WON'), '[^a-zA-Z0-9]', '', 'g') || 'WON', 3))
  || '-' ||
  upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
where join_code is null or btrim(join_code) = '';

create unique index if not exists projects_join_code_idx
  on public.projects (join_code);

alter table public.projects
  alter column join_code set not null;

create or replace function private.tg_projects_ensure_join_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.join_code is null or btrim(new.join_code) = '' then
    new.join_code := upper(left(regexp_replace(coalesce(new.name, 'WON'), '[^a-zA-Z0-9]', '', 'g') || 'WON', 3))
      || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
  end if;
  new.join_code := upper(new.join_code);
  return new;
end;
$$;

drop trigger if exists projects_ensure_join_code on public.projects;
create trigger projects_ensure_join_code
  before insert or update on public.projects
  for each row execute function private.tg_projects_ensure_join_code();
