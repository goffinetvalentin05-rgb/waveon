-- Migration: base_participations + pool (système gains sur X participations)
-- Fonctionne que les tables wheels / wheel_items existent déjà ou non.

-- 0) Types et tables manquantes (création si besoin)
do $$ begin
  create type public.wheel_item_type as enum ('win', 'lose');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.wheels (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  is_active boolean not null default true,
  base_participations int not null default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (campaign_id),
  check (base_participations >= 1)
);

create table if not exists public.wheel_items (
  id uuid primary key default uuid_generate_v4(),
  wheel_id uuid not null references public.wheels(id) on delete cascade,
  label text not null,
  kind public.wheel_item_type not null default 'lose',
  max_wins int not null default 0,
  is_active boolean not null default true,
  position int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (max_wins >= 0)
);

-- 1) wheels : colonnes pour anciennes bases (AVANT les politiques qui les utilisent)
alter table public.wheels
  add column if not exists base_participations int not null default 100;

alter table public.wheels
  add column if not exists is_active boolean not null default true;

do $$
begin
  alter table public.wheels
    add constraint wheels_base_participations_check
    check (base_participations >= 1);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.wheels drop column if exists name;
exception
  when undefined_column then null;
end $$;

alter table public.wheels enable row level security;
alter table public.wheel_items enable row level security;

do $$
begin
  create policy "Public can read active wheels"
    on public.wheels for select using (is_active = true);
exception when duplicate_object then null;
end $$;
do $$
begin
  create policy "Owners manage wheels"
    on public.wheels for all
    using (exists (select 1 from public.campaigns c where c.id = wheels.campaign_id and c.user_id = auth.uid()))
    with check (exists (select 1 from public.campaigns c where c.id = wheels.campaign_id and c.user_id = auth.uid()));
exception when duplicate_object then null;
end $$;
do $$
begin
  create policy "Public can read active wheel items"
    on public.wheel_items for select
    using (is_active = true and exists (select 1 from public.wheels w where w.id = wheel_items.wheel_id and w.is_active = true));
exception when duplicate_object then null;
end $$;
do $$
begin
  create policy "Owners manage wheel items"
    on public.wheel_items for all
    using (exists (select 1 from public.wheels w join public.campaigns c on c.id = w.campaign_id where w.id = wheel_items.wheel_id and c.user_id = auth.uid()))
    with check (exists (select 1 from public.wheels w join public.campaigns c on c.id = w.campaign_id where w.id = wheel_items.wheel_id and c.user_id = auth.uid()));
exception when duplicate_object then null;
end $$;

-- 2) wheel_items : adaptation si la table existait avec l’ancien schéma (weight)
do $$
begin
  alter table public.wheel_items drop column if exists weight;
exception
  when undefined_column then null;
end $$;

do $$
begin
  update public.wheel_items set max_wins = coalesce(max_wins, 0) where max_wins is null;
  alter table public.wheel_items alter column max_wins set not null;
  alter table public.wheel_items alter column max_wins set default 0;
exception
  when others then null;
end $$;

do $$
begin
  alter table public.wheel_items drop constraint if exists wheel_items_weight_check;
exception
  when undefined_object then null;
end $$;

do $$
begin
  alter table public.wheel_items
    add constraint wheel_items_max_wins_check check (max_wins >= 0);
exception
  when duplicate_object then null;
end $$;

-- 3) wheel_pool_remaining
create table if not exists public.wheel_pool_remaining (
  wheel_id uuid not null references public.wheels(id) on delete cascade,
  wheel_item_id uuid references public.wheel_items(id) on delete cascade,
  remaining int not null default 0,
  primary key (wheel_id, wheel_item_id),
  check (remaining >= 0)
);

alter table public.wheel_pool_remaining enable row level security;

do $$
begin
  create policy "Owners manage wheel pool"
    on public.wheel_pool_remaining for all
    using (
      exists (
        select 1
        from public.wheels w
        join public.campaigns c on c.id = w.campaign_id
        where w.id = wheel_pool_remaining.wheel_id
        and c.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.wheels w
        join public.campaigns c on c.id = w.campaign_id
        where w.id = wheel_pool_remaining.wheel_id
        and c.user_id = auth.uid()
      )
    );
exception
  when duplicate_object then null;
end $$;

-- 4) spins : wheel_item_id nullable (pour tirage "Perdu")
do $$
begin
  alter table public.spins alter column wheel_item_id drop not null;
exception
  when undefined_table then null;
  when undefined_column then null;
end $$;

-- 5) Fonctions
create or replace function public.init_wheel_pool(p_wheel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base int;
  v_sum_wins int;
  v_perte int;
begin
  select base_participations into v_base
  from public.wheels
  where id = p_wheel_id;

  if v_base is null then
    raise exception 'WHEEL_NOT_FOUND';
  end if;

  select coalesce(sum(wi.max_wins), 0) into v_sum_wins
  from public.wheel_items wi
  where wi.wheel_id = p_wheel_id
    and wi.is_active = true
    and wi.max_wins > 0;

  v_perte := v_base - v_sum_wins;
  if v_perte < 0 then
    raise exception 'POOL_OVER_BASE';
  end if;

  delete from public.wheel_pool_remaining
  where wheel_id = p_wheel_id;

  insert into public.wheel_pool_remaining (wheel_id, wheel_item_id, remaining)
  select p_wheel_id, wi.id, wi.max_wins
  from public.wheel_items wi
  where wi.wheel_id = p_wheel_id
    and wi.is_active = true
    and wi.max_wins > 0;

  if v_perte > 0 then
    insert into public.wheel_pool_remaining (wheel_id, wheel_item_id, remaining)
    values (p_wheel_id, null, v_perte);
  end if;
end;
$$;

create or replace function public.spin_wheel(
  p_campaign_id uuid,
  p_participation_id uuid,
  p_client_token text
)
returns table (
  spin_id uuid,
  wheel_item_id uuid,
  wheel_item_label text,
  wheel_item_type public.wheel_item_type
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wheel_id uuid;
  v_total int;
  v_rand int;
  v_running int := 0;
  v_row record;
  v_existing uuid;
begin
  if p_client_token is null or length(p_client_token) < 10 then
    raise exception 'INVALID_CLIENT_TOKEN';
  end if;

  select id into v_wheel_id
  from public.wheels
  where campaign_id = p_campaign_id
    and is_active = true
  limit 1;

  if v_wheel_id is null then
    raise exception 'WHEEL_NOT_FOUND';
  end if;

  select id into v_existing
  from public.spins
  where campaign_id = p_campaign_id
    and client_token = p_client_token
  limit 1;

  if v_existing is not null then
    raise exception 'ALREADY_SPUN';
  end if;

  perform 1
  from public.participations
  where id = p_participation_id
    and campaign_id = p_campaign_id
    and did_review = true
    and client_token = p_client_token;

  if not found then
    raise exception 'REVIEW_NOT_VALIDATED';
  end if;

  select coalesce(sum(remaining), 0) into v_total
  from public.wheel_pool_remaining
  where wheel_id = v_wheel_id;

  if v_total <= 0 then
    raise exception 'POOL_EMPTY';
  end if;

  v_rand := floor(random() * v_total)::int + 1;

  for v_row in
    select wpr.wheel_item_id, wi.label, wi.kind, wpr.remaining
    from public.wheel_pool_remaining wpr
    left join public.wheel_items wi on wi.id = wpr.wheel_item_id
    where wpr.wheel_id = v_wheel_id
      and wpr.remaining > 0
    order by wpr.wheel_item_id nulls last
  loop
    v_running := v_running + v_row.remaining;
    if v_rand <= v_running then
      update public.wheel_pool_remaining
      set remaining = remaining - 1
      where wheel_id = v_wheel_id
        and (wheel_item_id is not distinct from v_row.wheel_item_id);

      insert into public.spins (
        campaign_id,
        wheel_id,
        wheel_item_id,
        participation_id,
        client_token,
        result
      )
      values (
        p_campaign_id,
        v_wheel_id,
        v_row.wheel_item_id,
        p_participation_id,
        p_client_token,
        coalesce(v_row.kind, 'lose'::public.wheel_item_type)
      )
      returning id into spin_id;

      wheel_item_id := v_row.wheel_item_id;
      wheel_item_label := coalesce(v_row.label, 'Perdu');
      wheel_item_type := coalesce(v_row.kind, 'lose'::public.wheel_item_type);
      return next;
      return;
    end if;
  end loop;

  raise exception 'SPIN_FAILED';
end;
$$;

-- Droits d'exécution pour le dashboard (authentified) et l'API (service_role)
grant execute on function public.init_wheel_pool(uuid) to authenticated;
grant execute on function public.init_wheel_pool(uuid) to service_role;
grant execute on function public.spin_wheel(uuid, uuid, text) to authenticated;
grant execute on function public.spin_wheel(uuid, uuid, text) to anon;
grant execute on function public.spin_wheel(uuid, uuid, text) to service_role;
