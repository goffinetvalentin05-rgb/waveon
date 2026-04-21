-- Notifications email commerçant (indépendantes des emails clients)
alter table public.wavon_businesses
  add column if not exists notify_owner_on_new_reservation boolean not null default true;

alter table public.wavon_businesses
  add column if not exists notify_owner_on_cancellation boolean not null default true;

comment on column public.wavon_businesses.notify_owner_on_new_reservation is
  'Si true, le commerçant reçoit un email à chaque nouvelle réservation.';
comment on column public.wavon_businesses.notify_owner_on_cancellation is
  'Si true, le commerçant reçoit un email à chaque annulation.';
