-- Comptes-rendus de rencontre liés aux prospects.
-- Réutilise prospect_activities (timeline) + daily_tasks (suivi).

create table if not exists public.prospect_meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  activity_id uuid references public.prospect_activities (id) on delete set null,
  title text not null,
  meeting_type text not null default 'rencontre'
    check (meeting_type in ('rencontre', 'demo', 'rendez_vous', 'visite', 'autre')),
  occurred_at timestamptz not null default now(),
  participants jsonb not null default '[]'::jsonb,
  notes_free text,
  report jsonb not null default '{}'::jsonb,
  extracted_text text,
  actions_created_count integer not null default 0,
  revisions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospect_meetings_prospect_idx
  on public.prospect_meetings (prospect_id, occurred_at desc);

create index if not exists prospect_meetings_activity_idx
  on public.prospect_meetings (activity_id);

create table if not exists public.prospect_meeting_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meeting_id uuid not null references public.prospect_meetings (id) on delete cascade,
  storage_path text not null,
  mime_type text,
  file_name text,
  created_at timestamptz not null default now()
);

create index if not exists prospect_meeting_attachments_meeting_idx
  on public.prospect_meeting_attachments (meeting_id, created_at);

drop trigger if exists trg_prospect_meetings_updated_at on public.prospect_meetings;
create trigger trg_prospect_meetings_updated_at
  before update on public.prospect_meetings
  for each row execute function public.tg_crm_set_updated_at();

alter table public.prospect_meetings enable row level security;
alter table public.prospect_meeting_attachments enable row level security;

drop policy if exists "Meetings readable by prospect access" on public.prospect_meetings;
create policy "Meetings readable by prospect access"
  on public.prospect_meetings for select
  using (auth.uid() = user_id or private.can_access_prospect(prospect_id));

drop policy if exists "Meetings insertable by prospect access" on public.prospect_meetings;
create policy "Meetings insertable by prospect access"
  on public.prospect_meetings for insert
  with check (auth.uid() = user_id and private.can_write_prospect(prospect_id));

drop policy if exists "Meetings updatable by prospect access" on public.prospect_meetings;
create policy "Meetings updatable by prospect access"
  on public.prospect_meetings for update
  using (auth.uid() = user_id or private.can_write_prospect(prospect_id))
  with check (auth.uid() = user_id or private.can_write_prospect(prospect_id));

drop policy if exists "Meetings deletable by prospect access" on public.prospect_meetings;
create policy "Meetings deletable by prospect access"
  on public.prospect_meetings for delete
  using (auth.uid() = user_id or private.can_write_prospect(prospect_id));

drop policy if exists "Meeting attachments readable by prospect access" on public.prospect_meeting_attachments;
create policy "Meeting attachments readable by prospect access"
  on public.prospect_meeting_attachments for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.prospect_meetings m
      where m.id = meeting_id
        and private.can_access_prospect(m.prospect_id)
    )
  );

drop policy if exists "Meeting attachments insertable by prospect access" on public.prospect_meeting_attachments;
create policy "Meeting attachments insertable by prospect access"
  on public.prospect_meeting_attachments for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.prospect_meetings m
      where m.id = meeting_id
        and private.can_write_prospect(m.prospect_id)
    )
  );

drop policy if exists "Meeting attachments deletable by prospect access" on public.prospect_meeting_attachments;
create policy "Meeting attachments deletable by prospect access"
  on public.prospect_meeting_attachments for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.prospect_meetings m
      where m.id = meeting_id
        and private.can_write_prospect(m.prospect_id)
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prospect-meetings',
  'prospect-meetings',
  false,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  execute 'drop policy if exists "Prospect meeting notes insert" on storage.objects';
  execute $p$
    create policy "Prospect meeting notes insert"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'prospect-meetings'
        and split_part(name, '/', 1) = auth.uid()::text
        and private.can_write_prospect(nullif(split_part(name, '/', 2), '')::uuid)
      )
  $p$;

  execute 'drop policy if exists "Prospect meeting notes select" on storage.objects';
  execute $p$
    create policy "Prospect meeting notes select"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'prospect-meetings'
        and (
          split_part(name, '/', 1) = auth.uid()::text
          or private.can_access_prospect(nullif(split_part(name, '/', 2), '')::uuid)
        )
      )
  $p$;

  execute 'drop policy if exists "Prospect meeting notes delete" on storage.objects';
  execute $p$
    create policy "Prospect meeting notes delete"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'prospect-meetings'
        and (
          split_part(name, '/', 1) = auth.uid()::text
          or private.can_write_prospect(nullif(split_part(name, '/', 2), '')::uuid)
        )
      )
  $p$;
exception
  when insufficient_privilege then
    raise notice 'Skipping: cannot manage storage.objects policies. Configure Storage policies in the dashboard.';
  when others then
    raise notice 'Skipping: storage.objects policy setup failed: %', sqlerrm;
end
$$;
