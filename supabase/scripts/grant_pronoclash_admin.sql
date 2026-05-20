-- Accorde is_admin à un compte existant (Prono Clash).
-- À exécuter dans le SQL Editor Supabase (production) une fois le user inscrit.

update public.profiles p
set is_admin = true
from auth.users u
where p.id = u.id
  and lower(trim(u.email::text)) = lower(trim('goffinetvalentin05@gmail.com'));
