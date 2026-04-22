-- ==========================================================
-- Waevon : multi-employés (1/3) - Table wavon_employees + RLS
-- ==========================================================

create extension if not exists pgcrypto;

create table if not exists public.wavon_employees (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.wavon_businesses(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  photo_url text,
  color text not null,
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wavon_employees_business_id_idx
  on public.wavon_employees(business_id, display_order asc, created_at asc);

-- updated_at trigger
drop trigger if exists wavon_employees_set_updated_at on public.wavon_employees;
create trigger wavon_employees_set_updated_at
before update on public.wavon_employees
for each row execute function public.wavon_set_updated_at();

-- RLS
alter table public.wavon_employees enable row level security;

drop policy if exists "Wavon employees owner CRUD" on public.wavon_employees;
create policy "Wavon employees owner CRUD"
  on public.wavon_employees
  for all
  using (public.wavon_is_business_owner(business_id))
  with check (public.wavon_is_business_owner(business_id));

