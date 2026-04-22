-- Waevon : blocage écritures + réservation publique quand essai expiré et pas d’abonnement Stripe (id en base).
-- Lecture propriétaire inchangée pour éviter de casser le chargement côté app ; le middleware/UI limite l’exposition.

create or replace function public.wavon_business_saas_allowed(p_business_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (
      select
        coalesce(b.trial_ends_at, b.created_at + interval '7 days') > now()
        or (
          b.stripe_subscription_id is not null
          and length(trim(b.stripe_subscription_id)) > 0
        )
      from public.wavon_businesses b
      where b.id = p_business_id
    ),
    false
  );
$$;

comment on function public.wavon_business_saas_allowed(uuid) is
  'True si essai Waevon encore valide (trial_ends_at ou created_at+7j) ou si un stripe_subscription_id est enregistré.';

-- ---------------------------------------------------------------------------
-- wavon_businesses : pas de garde sur les policies propriétaire (mise à jour Stripe).
-- ---------------------------------------------------------------------------

drop policy if exists "Wavon businesses public read by slug" on public.wavon_businesses;
create policy "Wavon businesses public read by slug"
  on public.wavon_businesses
  for select
  using (
    public_slug is not null
    and public.wavon_business_saas_allowed(id)
  );

-- ---------------------------------------------------------------------------
-- Tables métier : SELECT propriétaire seul ; écritures si SaaS allowed
-- ---------------------------------------------------------------------------

-- settings
drop policy if exists "Wavon settings owner CRUD" on public.wavon_settings;
drop policy if exists "Wavon settings owner select" on public.wavon_settings;
drop policy if exists "Wavon settings owner insert" on public.wavon_settings;
drop policy if exists "Wavon settings owner update" on public.wavon_settings;
drop policy if exists "Wavon settings owner delete" on public.wavon_settings;
create policy "Wavon settings owner select"
  on public.wavon_settings
  for select
  using (public.wavon_is_business_owner(business_id));
create policy "Wavon settings owner insert"
  on public.wavon_settings
  for insert
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon settings owner update"
  on public.wavon_settings
  for update
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  )
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon settings owner delete"
  on public.wavon_settings
  for delete
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );

drop policy if exists "Wavon settings public read for published business" on public.wavon_settings;
create policy "Wavon settings public read for published business"
  on public.wavon_settings
  for select
  using (
    exists (
      select 1 from public.wavon_businesses b
      where b.id = wavon_settings.business_id
        and b.public_slug is not null
        and public.wavon_business_saas_allowed(b.id)
    )
  );

-- services
drop policy if exists "Wavon services owner CRUD" on public.wavon_services;
drop policy if exists "Wavon services owner select" on public.wavon_services;
drop policy if exists "Wavon services owner insert" on public.wavon_services;
drop policy if exists "Wavon services owner update" on public.wavon_services;
drop policy if exists "Wavon services owner delete" on public.wavon_services;
create policy "Wavon services owner select"
  on public.wavon_services
  for select
  using (public.wavon_is_business_owner(business_id));
create policy "Wavon services owner insert"
  on public.wavon_services
  for insert
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon services owner update"
  on public.wavon_services
  for update
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  )
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon services owner delete"
  on public.wavon_services
  for delete
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );

drop policy if exists "Wavon services public read for published business" on public.wavon_services;
create policy "Wavon services public read for published business"
  on public.wavon_services
  for select
  using (
    is_public = true
    and is_active = true
    and exists (
      select 1 from public.wavon_businesses b
      where b.id = wavon_services.business_id
        and b.public_slug is not null
        and public.wavon_business_saas_allowed(b.id)
    )
  );

-- clients (owner)
drop policy if exists "Wavon clients owner CRUD" on public.wavon_clients;
drop policy if exists "Wavon clients owner select" on public.wavon_clients;
drop policy if exists "Wavon clients owner insert" on public.wavon_clients;
drop policy if exists "Wavon clients owner update" on public.wavon_clients;
drop policy if exists "Wavon clients owner delete" on public.wavon_clients;
create policy "Wavon clients owner select"
  on public.wavon_clients
  for select
  using (public.wavon_is_business_owner(business_id));
create policy "Wavon clients owner insert"
  on public.wavon_clients
  for insert
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon clients owner update"
  on public.wavon_clients
  for update
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  )
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon clients owner delete"
  on public.wavon_clients
  for delete
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );

drop policy if exists "Wavon clients public insert for published business" on public.wavon_clients;
create policy "Wavon clients public insert for published business"
  on public.wavon_clients
  for insert
  with check (
    exists (
      select 1 from public.wavon_businesses b
      where b.id = wavon_clients.business_id
        and b.public_slug is not null
        and public.wavon_business_saas_allowed(b.id)
    )
  );

-- reservations (owner)
drop policy if exists "Wavon reservations owner CRUD" on public.wavon_reservations;
drop policy if exists "Wavon reservations owner select" on public.wavon_reservations;
drop policy if exists "Wavon reservations owner insert" on public.wavon_reservations;
drop policy if exists "Wavon reservations owner update" on public.wavon_reservations;
drop policy if exists "Wavon reservations owner delete" on public.wavon_reservations;
create policy "Wavon reservations owner select"
  on public.wavon_reservations
  for select
  using (public.wavon_is_business_owner(business_id));
create policy "Wavon reservations owner insert"
  on public.wavon_reservations
  for insert
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon reservations owner update"
  on public.wavon_reservations
  for update
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  )
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon reservations owner delete"
  on public.wavon_reservations
  for delete
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );

drop policy if exists "Wavon reservations public insert for published business" on public.wavon_reservations;
create policy "Wavon reservations public insert for published business"
  on public.wavon_reservations
  for insert
  with check (
    exists (
      select 1 from public.wavon_businesses b
      where b.id = wavon_reservations.business_id
        and b.public_slug is not null
        and public.wavon_business_saas_allowed(b.id)
    )
  );

drop policy if exists "Wavon reservations public read for published business" on public.wavon_reservations;
create policy "Wavon reservations public read for published business"
  on public.wavon_reservations
  for select
  using (
    exists (
      select 1 from public.wavon_businesses b
      where b.id = wavon_reservations.business_id
        and b.public_slug is not null
        and public.wavon_business_saas_allowed(b.id)
    )
  );

-- availability rules
drop policy if exists "Wavon availability rules owner CRUD" on public.wavon_availability_rules;
drop policy if exists "Wavon availability rules owner select" on public.wavon_availability_rules;
drop policy if exists "Wavon availability rules owner insert" on public.wavon_availability_rules;
drop policy if exists "Wavon availability rules owner update" on public.wavon_availability_rules;
drop policy if exists "Wavon availability rules owner delete" on public.wavon_availability_rules;
create policy "Wavon availability rules owner select"
  on public.wavon_availability_rules
  for select
  using (public.wavon_is_business_owner(business_id));
create policy "Wavon availability rules owner insert"
  on public.wavon_availability_rules
  for insert
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon availability rules owner update"
  on public.wavon_availability_rules
  for update
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  )
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon availability rules owner delete"
  on public.wavon_availability_rules
  for delete
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );

drop policy if exists "Wavon availability public read for published business" on public.wavon_availability_rules;
create policy "Wavon availability public read for published business"
  on public.wavon_availability_rules
  for select
  using (
    exists (
      select 1 from public.wavon_businesses b
      where b.id = wavon_availability_rules.business_id
        and b.public_slug is not null
        and public.wavon_business_saas_allowed(b.id)
    )
  );

-- custom days
drop policy if exists "Wavon custom days owner CRUD" on public.wavon_custom_days;
drop policy if exists "Wavon custom days owner select" on public.wavon_custom_days;
drop policy if exists "Wavon custom days owner insert" on public.wavon_custom_days;
drop policy if exists "Wavon custom days owner update" on public.wavon_custom_days;
drop policy if exists "Wavon custom days owner delete" on public.wavon_custom_days;
create policy "Wavon custom days owner select"
  on public.wavon_custom_days
  for select
  using (public.wavon_is_business_owner(business_id));
create policy "Wavon custom days owner insert"
  on public.wavon_custom_days
  for insert
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon custom days owner update"
  on public.wavon_custom_days
  for update
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  )
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon custom days owner delete"
  on public.wavon_custom_days
  for delete
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );

-- blocked dates
drop policy if exists "Wavon blocked dates owner CRUD" on public.wavon_blocked_dates;
drop policy if exists "Wavon blocked dates owner select" on public.wavon_blocked_dates;
drop policy if exists "Wavon blocked dates owner insert" on public.wavon_blocked_dates;
drop policy if exists "Wavon blocked dates owner update" on public.wavon_blocked_dates;
drop policy if exists "Wavon blocked dates owner delete" on public.wavon_blocked_dates;
create policy "Wavon blocked dates owner select"
  on public.wavon_blocked_dates
  for select
  using (public.wavon_is_business_owner(business_id));
create policy "Wavon blocked dates owner insert"
  on public.wavon_blocked_dates
  for insert
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon blocked dates owner update"
  on public.wavon_blocked_dates
  for update
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  )
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon blocked dates owner delete"
  on public.wavon_blocked_dates
  for delete
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );

drop policy if exists "Wavon blocked dates public read for published business" on public.wavon_blocked_dates;
create policy "Wavon blocked dates public read for published business"
  on public.wavon_blocked_dates
  for select
  using (
    exists (
      select 1 from public.wavon_businesses b
      where b.id = wavon_blocked_dates.business_id
        and b.public_slug is not null
        and public.wavon_business_saas_allowed(b.id)
    )
  );

-- email templates
drop policy if exists "Wavon email templates owner CRUD" on public.wavon_email_templates;
drop policy if exists "Wavon email templates owner select" on public.wavon_email_templates;
drop policy if exists "Wavon email templates owner insert" on public.wavon_email_templates;
drop policy if exists "Wavon email templates owner update" on public.wavon_email_templates;
drop policy if exists "Wavon email templates owner delete" on public.wavon_email_templates;
create policy "Wavon email templates owner select"
  on public.wavon_email_templates
  for select
  using (public.wavon_is_business_owner(business_id));
create policy "Wavon email templates owner insert"
  on public.wavon_email_templates
  for insert
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon email templates owner update"
  on public.wavon_email_templates
  for update
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  )
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon email templates owner delete"
  on public.wavon_email_templates
  for delete
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );

drop policy if exists "Wavon email templates public read for published business" on public.wavon_email_templates;
create policy "Wavon email templates public read for published business"
  on public.wavon_email_templates
  for select
  using (
    exists (
      select 1 from public.wavon_businesses b
      where b.id = wavon_email_templates.business_id
        and b.public_slug is not null
        and public.wavon_business_saas_allowed(b.id)
    )
  );

-- email settings (scheduled emails)
drop policy if exists "Wavon email settings owner CRUD" on public.wavon_email_settings;
drop policy if exists "Wavon email settings owner select" on public.wavon_email_settings;
drop policy if exists "Wavon email settings owner insert" on public.wavon_email_settings;
drop policy if exists "Wavon email settings owner update" on public.wavon_email_settings;
drop policy if exists "Wavon email settings owner delete" on public.wavon_email_settings;
create policy "Wavon email settings owner select"
  on public.wavon_email_settings
  for select
  using (public.wavon_is_business_owner(business_id));
create policy "Wavon email settings owner insert"
  on public.wavon_email_settings
  for insert
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon email settings owner update"
  on public.wavon_email_settings
  for update
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  )
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon email settings owner delete"
  on public.wavon_email_settings
  for delete
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );

-- employees
drop policy if exists "Wavon employees owner CRUD" on public.wavon_employees;
drop policy if exists "Wavon employees owner select" on public.wavon_employees;
drop policy if exists "Wavon employees owner insert" on public.wavon_employees;
drop policy if exists "Wavon employees owner update" on public.wavon_employees;
drop policy if exists "Wavon employees owner delete" on public.wavon_employees;
create policy "Wavon employees owner select"
  on public.wavon_employees
  for select
  using (public.wavon_is_business_owner(business_id));
create policy "Wavon employees owner insert"
  on public.wavon_employees
  for insert
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon employees owner update"
  on public.wavon_employees
  for update
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  )
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Wavon employees owner delete"
  on public.wavon_employees
  for delete
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );

-- blocked_slots
drop policy if exists "Blocked slots owner CRUD" on public.blocked_slots;
drop policy if exists "Blocked slots owner select" on public.blocked_slots;
drop policy if exists "Blocked slots owner insert" on public.blocked_slots;
drop policy if exists "Blocked slots owner update" on public.blocked_slots;
drop policy if exists "Blocked slots owner delete" on public.blocked_slots;
create policy "Blocked slots owner select"
  on public.blocked_slots
  for select
  using (public.wavon_is_business_owner(business_id));
create policy "Blocked slots owner insert"
  on public.blocked_slots
  for insert
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Blocked slots owner update"
  on public.blocked_slots
  for update
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  )
  with check (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );
create policy "Blocked slots owner delete"
  on public.blocked_slots
  for delete
  using (
    public.wavon_is_business_owner(business_id)
    and public.wavon_business_saas_allowed(business_id)
  );

drop policy if exists "Blocked slots public read for published business" on public.blocked_slots;
create policy "Blocked slots public read for published business"
  on public.blocked_slots
  for select
  using (
    exists (
      select 1 from public.wavon_businesses b
      where b.id = blocked_slots.business_id
        and b.public_slug is not null
        and public.wavon_business_saas_allowed(b.id)
    )
  );

-- ---------------------------------------------------------------------------
-- Storage (wavon-branding) : écriture seulement si SaaS OK ; lecture publique alignée
-- ---------------------------------------------------------------------------

do $$
begin
  execute 'drop policy if exists "Wavon branding objects owner insert" on storage.objects';
  execute $p$
    create policy "Wavon branding objects owner insert"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'wavon-branding'
        and public.wavon_is_business_owner(nullif(split_part(name, '/', 2), '')::uuid)
        and public.wavon_business_saas_allowed(nullif(split_part(name, '/', 2), '')::uuid)
      )
  $p$;

  execute 'drop policy if exists "Wavon branding objects owner update" on storage.objects';
  execute $p$
    create policy "Wavon branding objects owner update"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'wavon-branding'
        and public.wavon_is_business_owner(nullif(split_part(name, '/', 2), '')::uuid)
        and public.wavon_business_saas_allowed(nullif(split_part(name, '/', 2), '')::uuid)
      )
      with check (
        bucket_id = 'wavon-branding'
        and public.wavon_is_business_owner(nullif(split_part(name, '/', 2), '')::uuid)
        and public.wavon_business_saas_allowed(nullif(split_part(name, '/', 2), '')::uuid)
      )
  $p$;

  execute 'drop policy if exists "Wavon branding objects owner delete" on storage.objects';
  execute $p$
    create policy "Wavon branding objects owner delete"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'wavon-branding'
        and public.wavon_is_business_owner(nullif(split_part(name, '/', 2), '')::uuid)
        and public.wavon_business_saas_allowed(nullif(split_part(name, '/', 2), '')::uuid)
      )
  $p$;

  execute 'drop policy if exists "Wavon branding objects public read for published business" on storage.objects';
  execute $p$
    create policy "Wavon branding objects public read for published business"
      on storage.objects
      for select
      to anon, authenticated
      using (
        bucket_id = 'wavon-branding'
        and exists (
          select 1
          from public.wavon_businesses b
          where b.id = nullif(split_part(name, '/', 2), '')::uuid
            and b.public_slug is not null
            and public.wavon_business_saas_allowed(b.id)
        )
      )
  $p$;
exception
  when insufficient_privilege then
    raise notice 'Skipping storage.objects policies (not owner).';
  when others then
    raise notice 'storage.objects policy update failed: %', sqlerrm;
end
$$;
