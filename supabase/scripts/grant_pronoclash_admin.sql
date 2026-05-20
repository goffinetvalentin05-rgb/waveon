-- Accorde is_admin à UN compte existant (Prono Clash).
-- MANUEL UNIQUEMENT — SQL Editor production. Jamais dans une migration automatique.
-- Ne met jamais is_admin = false en masse.

update public.profiles p
set is_admin = true
from auth.users u
where p.id = u.id
  and lower(trim(u.email::text)) = lower(trim('goffinetvalentin05@gmail.com'));
