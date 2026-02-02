create extension if not exists "uuid-ossp";

create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  email text,
  created_at timestamptz default now()
);

create table if not exists public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  slug text unique not null,
  business_name text not null,
  business_type text,
  address text,
  logo_url text,
  objective text,
  link text,
  target_url text,
  is_active boolean not null default true,
  google_review_url text,
  instagram_url text,
  win_ratio int not null default 10,
  created_at timestamptz default now()
);

create table if not exists public.rewards (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  label text not null,
  created_at timestamptz default now()
);

do $$ begin
  create type public.participation_result as enum ('win', 'lose');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.participations (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  created_at timestamptz default now(),
  event_type text not null default 'visit',
  did_review boolean default false,
  did_follow boolean default false,
  result public.participation_result,
  prize text,
  client_token text,
  review_validated_at timestamptz
);

do $$ begin
  create type public.wheel_item_type as enum ('win', 'lose');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.reward_claim_status as enum ('pending', 'claimed', 'canceled');
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

create table if not exists public.wheel_pool_remaining (
  wheel_id uuid not null references public.wheels(id) on delete cascade,
  wheel_item_id uuid references public.wheel_items(id) on delete cascade,
  remaining int not null default 0,
  primary key (wheel_id, wheel_item_id),
  check (remaining >= 0)
);

create table if not exists public.spins (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  wheel_id uuid not null references public.wheels(id) on delete cascade,
  wheel_item_id uuid references public.wheel_items(id) on delete cascade,
  participation_id uuid references public.participations(id) on delete set null,
  client_token text not null,
  result public.wheel_item_type not null,
  created_at timestamptz default now(),
  unique (campaign_id, client_token)
);

create table if not exists public.reward_claims (
  id uuid primary key default uuid_generate_v4(),
  spin_id uuid not null references public.spins(id) on delete cascade,
  status public.reward_claim_status not null default 'pending',
  claimed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.users enable row level security;
alter table public.campaigns enable row level security;
alter table public.rewards enable row level security;
alter table public.participations enable row level security;
alter table public.wheel_pool_remaining enable row level security;
alter table public.wheels enable row level security;
alter table public.wheel_items enable row level security;
alter table public.spins enable row level security;
alter table public.reward_claims enable row level security;

create policy "Users can read their profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert their profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update their profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Campaigns are public readable"
  on public.campaigns for select
  using (true);

create policy "Owners manage campaigns"
  on public.campaigns for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Rewards are public readable"
  on public.rewards for select
  using (true);

create policy "Owners manage rewards"
  on public.rewards for all
  using (
    exists (
      select 1
      from public.campaigns c
      where c.id = rewards.campaign_id
      and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.campaigns c
      where c.id = rewards.campaign_id
      and c.user_id = auth.uid()
    )
  );

create policy "Public can insert participations"
  on public.participations for insert
  with check (true);

create policy "Owners can read participations"
  on public.participations for select
  using (
    exists (
      select 1
      from public.campaigns c
      where c.id = participations.campaign_id
      and c.user_id = auth.uid()
    )
  );

create policy "Public can read active wheels"
  on public.wheels for select
  using (is_active = true);

create policy "Owners manage wheels"
  on public.wheels for all
  using (
    exists (
      select 1
      from public.campaigns c
      where c.id = wheels.campaign_id
      and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.campaigns c
      where c.id = wheels.campaign_id
      and c.user_id = auth.uid()
    )
  );

create policy "Public can read active wheel items"
  on public.wheel_items for select
  using (
    is_active = true
    and exists (
      select 1
      from public.wheels w
      where w.id = wheel_items.wheel_id
      and w.is_active = true
    )
  );

create policy "Owners manage wheel items"
  on public.wheel_items for all
  using (
    exists (
      select 1
      from public.wheels w
      join public.campaigns c on c.id = w.campaign_id
      where w.id = wheel_items.wheel_id
      and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.wheels w
      join public.campaigns c on c.id = w.campaign_id
      where w.id = wheel_items.wheel_id
      and c.user_id = auth.uid()
    )
  );

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

create policy "Owners can read spins"
  on public.spins for select
  using (
    exists (
      select 1
      from public.campaigns c
      where c.id = spins.campaign_id
      and c.user_id = auth.uid()
    )
  );

create policy "Owners can read reward claims"
  on public.reward_claims for select
  using (
    exists (
      select 1
      from public.spins s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = reward_claims.spin_id
      and c.user_id = auth.uid()
    )
  );

create policy "Owners manage reward claims"
  on public.reward_claims for all
  using (
    exists (
      select 1
      from public.spins s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = reward_claims.spin_id
      and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.spins s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = reward_claims.spin_id
      and c.user_id = auth.uid()
    )
  );

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
  v_lose_item_id uuid;
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
    select id into v_lose_item_id
    from public.wheel_items
    where wheel_id = p_wheel_id
      and kind = 'lose'
    limit 1;

    if v_lose_item_id is null then
      insert into public.wheel_items (wheel_id, label, kind, max_wins, is_active, position)
      values (p_wheel_id, 'Perte', 'lose', 0, true, 999)
      returning id into v_lose_item_id;
    end if;

    insert into public.wheel_pool_remaining (wheel_id, wheel_item_id, remaining)
    values (p_wheel_id, v_lose_item_id, v_perte);
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

grant execute on function public.init_wheel_pool(uuid) to authenticated;
grant execute on function public.init_wheel_pool(uuid) to service_role;
grant execute on function public.spin_wheel(uuid, uuid, text) to authenticated;
grant execute on function public.spin_wheel(uuid, uuid, text) to anon;
grant execute on function public.spin_wheel(uuid, uuid, text) to service_role;

