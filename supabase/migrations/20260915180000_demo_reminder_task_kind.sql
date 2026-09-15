-- Permet une tâche interne de rappel avant une démo planifiée,
-- distincte de la tâche générique "demo" et de l'événement calendrier.

alter table public.daily_tasks
  drop constraint if exists daily_tasks_task_kind_check;

alter table public.daily_tasks
  add constraint daily_tasks_task_kind_check
  check (task_kind in ('follow_up', 'first_contact', 'demo', 'demo_reminder', 'custom'));
