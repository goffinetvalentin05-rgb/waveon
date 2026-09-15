-- Optionnel : le code n'en a plus besoin.
-- Les rappels de démo sont stockés en task_kind = 'custom'
-- et identifiés par le titre "Envoyer le rappel de démo%".
-- Conservé si on veut un type SQL dédié plus tard.

alter table public.daily_tasks
  drop constraint if exists daily_tasks_task_kind_check;

alter table public.daily_tasks
  add constraint daily_tasks_task_kind_check
  check (task_kind in ('follow_up', 'first_contact', 'demo', 'demo_reminder', 'custom'));
