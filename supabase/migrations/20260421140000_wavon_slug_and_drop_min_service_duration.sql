-- ==========================================================
-- Waevon : slug public (public_slug) + suppression durée min service globale
-- ==========================================================

-- 1) Retirer la durée minimum globale (redondante avec les services)
alter table public.wavon_settings
  drop constraint if exists wavon_minimum_service_duration_check;

alter table public.wavon_settings
  drop column if exists minimum_service_duration;

-- 2) Contrainte public_slug : 3–40 caractères si renseigné (format existant)
alter table public.wavon_businesses
  drop constraint if exists wavon_public_slug_format;

alter table public.wavon_businesses
  add constraint wavon_public_slug_format check (
    public_slug is null
    or (
      char_length(public_slug) between 3 and 40
      and public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    )
  );

-- 3) Backfill des public_slug NULL (slugify nom + suffixe si collision)
do $$
declare
  r record;
  base text;
  candidate text;
  n int;
begin
  for r in
    select id, coalesce(nullif(trim(business_name), ''), 'commerce') as biz_name
    from public.wavon_businesses
    where public_slug is null
  loop
    base := regexp_replace(
      trim(both '-' from regexp_replace(lower(r.biz_name), '[^a-z0-9]+', '-', 'g')),
      '-+',
      '-',
      'g'
    );
    if base is null or length(base) < 3 then
      base := 'commerce';
    end if;
    base := left(base, 32);
    candidate := base;
    n := 0;
    while exists (
      select 1 from public.wavon_businesses b
      where b.public_slug = candidate
        and b.id <> r.id
    ) loop
      n := n + 1;
      candidate := left(base, 28) || '-' || n::text;
      if length(candidate) > 40 then
        candidate := 'rdv-' || substr(replace(r.id::text, '-', ''), 1, 12);
        exit;
      end if;
    end loop;
    update public.wavon_businesses
    set public_slug = candidate
    where id = r.id;
  end loop;
end $$;

-- 4) Nouveaux comptes : slug provisoire unique (évite public_slug NULL)
create or replace function public.wavon_init_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_slug text;
begin
  v_slug := 'c-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 11);

  insert into public.wavon_businesses (user_id, public_slug)
  values (new.id, v_slug)
  on conflict (user_id) do update set user_id = excluded.user_id
  returning id into v_business_id;

  insert into public.wavon_settings (business_id)
  values (v_business_id)
  on conflict (business_id) do nothing;

  insert into public.wavon_email_templates (business_id, type, is_enabled, subject, body)
  values
    (v_business_id, 'confirmation', true, 'Confirmation de votre réservation', 'Bonjour {{client_name}},\n\nVotre réservation chez {{business_name}} pour {{service_name}} est confirmée le {{reservation_date}} à {{reservation_time}}.\n\n{{business_phone}}'),
    (v_business_id, 'reminder', false, 'Rappel de votre rendez-vous', 'Bonjour {{client_name}},\n\nRappel: {{service_name}} le {{reservation_date}} à {{reservation_time}} chez {{business_name}}.\n\n{{business_phone}}'),
    (v_business_id, 'cancellation', true, 'Annulation de votre réservation', 'Bonjour {{client_name}},\n\nVotre réservation chez {{business_name}} pour {{service_name}} le {{reservation_date}} à {{reservation_time}} a été annulée.\n\n{{business_phone}}')
  on conflict (business_id, type) do nothing;

  insert into public.wavon_availability_rules (business_id, day_of_week, is_open, segments)
  select v_business_id, d, false, '[]'::jsonb
  from generate_series(0,6) as d
  on conflict (business_id, day_of_week) do nothing;

  begin
    insert into public.wavon_email_settings (business_id, type, enabled, delay_hours, subject, body, custom_links)
    values
      (v_business_id, 'reminder_before'::public.wavon_email_setting_type, true, 24,
        'Rappel de votre rendez-vous chez {{business_name}}',
        'Bonjour {{client_name}},\n\nPetit rappel : {{service_name}} le {{reservation_date}} à {{reservation_time}}.\n\nÀ bientôt,\n{{business_name}}',
        '{}'::jsonb
      ),
      (v_business_id, 'post_service'::public.wavon_email_setting_type, true, 2,
        'Merci pour votre visite chez {{business_name}}',
        'Bonjour {{client_name}},\n\nMerci pour votre venue.\n\nSi vous avez 30 secondes, un avis nous aide énormément :',
        jsonb_build_object(
          'google_review', '',
          'instagram', '',
          'tiktok', '',
          'website', '',
          'other_label', '',
          'other_url', ''
        )
      )
    on conflict (business_id, type) do nothing;
  exception
    when undefined_table then null;
    when undefined_object then null;
    when others then null;
  end;

  return new;
end;
$$;

-- Index explicite sur public_slug (unique constraint en place déjà sur la colonne)
create index if not exists wavon_businesses_public_slug_lookup_idx
  on public.wavon_businesses (public_slug)
  where public_slug is not null;
