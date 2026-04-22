-- ==========================================================
-- Waevon : Blocage rapide de créneaux - Table blocked_slots + RLS
-- ==========================================================

create extension if not exists pgcrypto;

create table if not exists public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.wavon_businesses(id) on delete cascade,
  employee_id uuid references public.wavon_employees(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blocked_slots_time_check check (end_at > start_at)
);

create index if not exists blocked_slots_business_start_end_idx
  on public.blocked_slots(business_id, start_at asc, end_at asc);

create index if not exists blocked_slots_employee_id_idx
  on public.blocked_slots(employee_id, start_at asc);

-- updated_at trigger
drop trigger if exists blocked_slots_set_updated_at on public.blocked_slots;
create trigger blocked_slots_set_updated_at
before update on public.blocked_slots
for each row execute function public.wavon_set_updated_at();

-- RLS
alter table public.blocked_slots enable row level security;

drop policy if exists "Blocked slots owner CRUD" on public.blocked_slots;
create policy "Blocked slots owner CRUD"
  on public.blocked_slots
  for all
  using (public.wavon_is_business_owner(business_id))
  with check (public.wavon_is_business_owner(business_id));

-- Public booking access (read-only via published business)
drop policy if exists "Blocked slots public read for published business" on public.blocked_slots;
create policy "Blocked slots public read for published business"
  on public.blocked_slots
  for select
  using (
    exists (
      select 1 from public.wavon_businesses b
      where b.id = blocked_slots.business_id
        and b.public_slug is not null
    )
  );

