-- ==========================================================
-- Wavon - Harden weekly availability segments
-- - Normalizes existing jsonb segments
-- - Enforces: [{start:"HH:mm", end:"HH:mm"}], end > start
-- ==========================================================

-- Normalize segments: keep only valid items and sort by start time.
create or replace function public.wavon_normalize_segments(segments jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    (
      select jsonb_agg(jsonb_build_object('start', s.start, 'end', s."end") order by s.start)
      from (
        select
          elem->>'start' as start,
          elem->>'end' as "end"
        from jsonb_array_elements(coalesce(segments, '[]'::jsonb)) as elem
        where jsonb_typeof(coalesce(segments, '[]'::jsonb)) = 'array'
          and (elem ? 'start') and (elem ? 'end')
          and (elem->>'start') ~ '^\d{2}:\d{2}$'
          and (elem->>'end') ~ '^\d{2}:\d{2}$'
          and (
            (split_part(elem->>'end', ':', 1)::int * 60 + split_part(elem->>'end', ':', 2)::int) >
            (split_part(elem->>'start', ':', 1)::int * 60 + split_part(elem->>'start', ':', 2)::int)
          )
      ) s
    ),
    '[]'::jsonb
  );
$$;

-- Validate segments: array + every element is valid (format + end > start)
create or replace function public.wavon_segments_are_valid(segments jsonb)
returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(coalesce(segments, '[]'::jsonb)) = 'array'
    and public.wavon_normalize_segments(segments) = coalesce(segments, '[]'::jsonb);
$$;

-- Backfill/cleanup existing data to avoid constraint failures.
update public.wavon_availability_rules
set segments = public.wavon_normalize_segments(segments)
where segments is null
   or segments <> public.wavon_normalize_segments(segments);

update public.wavon_custom_days
set segments = public.wavon_normalize_segments(segments)
where segments is null
   or segments <> public.wavon_normalize_segments(segments);

-- Enforce constraints (re-runnable)
do $$ begin
  alter table public.wavon_availability_rules
    add constraint wavon_availability_segments_valid
    check (public.wavon_segments_are_valid(segments));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.wavon_custom_days
    add constraint wavon_custom_days_segments_valid
    check (public.wavon_segments_are_valid(segments));
exception when duplicate_object then null; end $$;

