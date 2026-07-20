-- Archivage soft + suppression en cascade des tâches liées

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS prospects_user_archived_at_idx
  ON public.prospects (user_id, archived_at);

-- Les tâches du jour doivent disparaître avec le prospect (plus de SET NULL)
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'daily_tasks'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'prospect_id'
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.daily_tasks DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

ALTER TABLE public.daily_tasks
  ADD CONSTRAINT daily_tasks_prospect_id_fkey
  FOREIGN KEY (prospect_id)
  REFERENCES public.prospects(id)
  ON DELETE CASCADE;

-- Types d'activité pour archivage / restauration
ALTER TABLE public.prospect_activities
  DROP CONSTRAINT IF EXISTS prospect_activities_action_type_check;

ALTER TABLE public.prospect_activities
  ADD CONSTRAINT prospect_activities_action_type_check
  CHECK (action_type IN (
    'mail_sent',
    'call_made',
    'demo_scheduled',
    'client',
    'refus',
    'note',
    'status_change',
    'imported',
    'created',
    'archived',
    'restored'
  ));
