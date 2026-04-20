-- Add cancel token for client-side cancellation links
-- Used by /api/reservations/cancel to securely cancel without auth.

alter table public.wavon_reservations
  add column if not exists cancel_token text,
  add column if not exists cancelled_at timestamptz;

-- Backfill existing rows
update public.wavon_reservations
set cancel_token = encode(gen_random_bytes(24), 'hex')
where cancel_token is null;

-- Ensure token is always present for new rows
alter table public.wavon_reservations
  alter column cancel_token set default encode(gen_random_bytes(24), 'hex');

-- (Optional) enforce non-null when safe
do $$
begin
  alter table public.wavon_reservations
    alter column cancel_token set not null;
exception
  when others then
    -- If existing data violates it for any reason, keep it nullable.
    null;
end $$;

