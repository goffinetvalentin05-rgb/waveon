-- Champs optionnels nullable + synchronisation phone / phone_number

alter table public.prospects add column if not exists phone text;
alter table public.prospects add column if not exists phone_number text;

-- Harmoniser les données existantes
update public.prospects
set phone = phone_number
where phone is null and phone_number is not null and trim(phone_number) <> '';

update public.prospects
set phone_number = phone
where phone_number is null and phone is not null and trim(phone) <> '';

-- Supprimer NOT NULL sur tous les champs optionnels
do $$ begin alter table public.prospects alter column phone_number drop not null; exception when others then null; end $$;
do $$ begin alter table public.prospects alter column phone drop not null; exception when others then null; end $$;
do $$ begin alter table public.prospects alter column name drop not null; exception when others then null; end $$;
do $$ begin alter table public.prospects alter column email drop not null; exception when others then null; end $$;
do $$ begin alter table public.prospects alter column contact_name drop not null; exception when others then null; end $$;
do $$ begin alter table public.prospects alter column website drop not null; exception when others then null; end $$;
do $$ begin alter table public.prospects alter column sport drop not null; exception when others then null; end $$;
do $$ begin alter table public.prospects alter column canton drop not null; exception when others then null; end $$;
do $$ begin alter table public.prospects alter column notes drop not null; exception when others then null; end $$;

-- Convertir les chaînes vides en NULL
update public.prospects set phone = null where trim(coalesce(phone, '')) = '';
update public.prospects set phone_number = null where trim(coalesce(phone_number, '')) = '';
update public.prospects set email = null where trim(coalesce(email, '')) = '';
update public.prospects set contact_name = null where trim(coalesce(contact_name, '')) = '';
update public.prospects set website = null where trim(coalesce(website, '')) = '';
update public.prospects set sport = null where trim(coalesce(sport, '')) = '';
update public.prospects set canton = null where trim(coalesce(canton, '')) = '';
update public.prospects set notes = null where trim(coalesce(notes, '')) = '';

-- Trigger : synchroniser phone ↔ phone_number et normaliser les vides → NULL
create or replace function public.tg_prospects_normalize_optional()
returns trigger
language plpgsql
as $$
begin
  -- Normaliser chaînes vides
  if trim(coalesce(new.phone, '')) = '' then new.phone := null; end if;
  if trim(coalesce(new.phone_number, '')) = '' then new.phone_number := null; end if;
  if trim(coalesce(new.email, '')) = '' then new.email := null; end if;
  if trim(coalesce(new.contact_name, '')) = '' then new.contact_name := null; end if;
  if trim(coalesce(new.website, '')) = '' then new.website := null; end if;
  if trim(coalesce(new.sport, '')) = '' then new.sport := null; end if;
  if trim(coalesce(new.canton, '')) = '' then new.canton := null; end if;
  if trim(coalesce(new.notes, '')) = '' then new.notes := null; end if;

  -- Synchroniser les deux colonnes téléphone
  if new.phone is not null and new.phone_number is null then
    new.phone_number := new.phone;
  elsif new.phone_number is not null and new.phone is null then
    new.phone := new.phone_number;
  end if;

  return new;
end;
$$;

drop trigger if exists prospects_normalize_optional on public.prospects;
create trigger prospects_normalize_optional
  before insert or update on public.prospects
  for each row execute function public.tg_prospects_normalize_optional();

-- Seul club_name reste obligatoire (déjà NOT NULL via migration CRM)
alter table public.prospects alter column club_name set not null;
