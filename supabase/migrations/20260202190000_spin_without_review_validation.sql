-- Align spin logic with time-based unlock flow.
-- Remove did_review check; participation is optional (created on-the-fly if needed).

create or replace function public.spin_wheel(
  p_campaign_id uuid,
  p_participation_id uuid,  -- optional: if null, we create one
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
  v_participation_id uuid := null;
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

  -- Use provided participation if valid, otherwise create one
  if p_participation_id is not null then
    perform 1
    from public.participations
    where id = p_participation_id
      and campaign_id = p_campaign_id
      and client_token = p_client_token;
    if found then
      v_participation_id := p_participation_id;
    end if;
  end if;

  if v_participation_id is null then
    insert into public.participations (
      campaign_id,
      event_type,
      client_token,
      did_review
    )
    values (
      p_campaign_id,
      'action',
      p_client_token,
      true
    )
    returning id into v_participation_id;
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
        v_participation_id,
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
