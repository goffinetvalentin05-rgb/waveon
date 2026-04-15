-- ==========================================================
-- Wavon - Public branding (logo + cover) via Supabase Storage
-- ==========================================================

-- Fields stored on wavon_businesses:
-- - public_display_name
-- - public_logo_url / public_logo_path
-- - public_cover_url / public_cover_path

alter table public.wavon_businesses
  add column if not exists public_display_name text,
  add column if not exists public_logo_path text,
  add column if not exists public_cover_url text,
  add column if not exists public_cover_path text;

-- ----------------------------------------------------------
-- Storage bucket (public read, controlled write via RLS)
-- ----------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wavon-branding',
  'wavon-branding',
  true,
  5242880, -- 5MB
  array['image/png','image/jpeg','image/webp','image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: businesses/<business_id>/branding/<file>
-- business_id is segment #2

-- NOTE:
-- On some Supabase projects, the SQL Editor role cannot ALTER/DROP/CREATE policies on storage.objects
-- (error 42501: must be owner of table objects).
-- We therefore attempt to install policies, but do NOT fail the migration if privileges are missing.

do $$
begin
  execute 'alter table storage.objects enable row level security';
exception
  when insufficient_privilege then
    raise notice 'Skipping: cannot ALTER storage.objects (not owner). Configure Storage policies in the dashboard instead.';
  when others then
    raise notice 'Skipping: alter storage.objects enable rls failed: %', sqlerrm;
end
$$;

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
      )
      with check (
        bucket_id = 'wavon-branding'
        and public.wavon_is_business_owner(nullif(split_part(name, '/', 2), '')::uuid)
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
        )
      )
  $p$;
exception
  when insufficient_privilege then
    raise notice 'Skipping: cannot manage storage.objects policies (not owner). Configure Storage policies in the dashboard instead.';
  when others then
    raise notice 'Skipping: storage.objects policy setup failed: %', sqlerrm;
end
$$;

