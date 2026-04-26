-- Réservation publique : lire les prestataires (employés) sans compte, comme services / dispos.
-- Avant : seul le propriétaire pouvait SELECT sur wavon_employees, donc le client JS (anon) voyait 0 employé.

drop policy if exists "Wavon employees public read for published saas business" on public.wavon_employees;
create policy "Wavon employees public read for published saas business"
  on public.wavon_employees
  for select
  using (
    exists (
      select 1
      from public.wavon_businesses b
      where b.id = wavon_employees.business_id
        and b.public_slug is not null
        and public.wavon_business_saas_allowed(b.id)
    )
  );
