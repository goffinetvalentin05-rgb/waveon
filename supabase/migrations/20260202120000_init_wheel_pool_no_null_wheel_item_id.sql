-- Fix: wheel_pool_remaining.wheel_item_id is part of PK, so NOT NULL.
-- init_wheel_pool must never insert null for wheel_item_id.
-- When v_perte > 0 we use a real wheel_item_id: get or create a "lose" item for this wheel.

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
