-- Devise du commerçant (affichage des prix dashboard + page publique + emails)
alter table public.wavon_businesses
  add column if not exists currency text not null default 'CHF';

alter table public.wavon_businesses
  drop constraint if exists wavon_businesses_currency_check;

alter table public.wavon_businesses
  add constraint wavon_businesses_currency_check
  check (currency in ('CHF', 'EUR', 'USD', 'GBP', 'CAD'));
