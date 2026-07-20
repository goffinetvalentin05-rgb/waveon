-- Colonne téléphone normalisée (chiffres seuls) et texte de recherche unifié

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS phone_digits text
  GENERATED ALWAYS AS (
    NULLIF(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), '')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_prospects_user_phone_digits
  ON prospects (user_id, phone_digits)
  WHERE phone_digits IS NOT NULL;

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS search_text text;

CREATE OR REPLACE FUNCTION crm_normalize_search(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(translate(
    coalesce(input, ''),
    'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝŸàáâãäåæçèéêëìíîïðñòóôõöøùúûüýÿ',
    'AAAAAAAACEEEEIIIIDNOOOOOOUUUUYYaaaaaaaaceeeeiiiidnoooooouuuuyy'
  )));
$$;

CREATE OR REPLACE FUNCTION prospects_build_search_text(
  p_club_name text,
  p_sport text,
  p_canton text,
  p_ville text,
  p_contact_name text,
  p_contact_function text,
  p_email text,
  p_website text,
  p_status text,
  p_notes text,
  p_phone_digits text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT crm_normalize_search(
    coalesce(p_club_name, '') || ' ' ||
    coalesce(p_sport, '') || ' ' ||
    coalesce(p_canton, '') || ' ' ||
    coalesce(p_ville, '') || ' ' ||
    coalesce(p_contact_name, '') || ' ' ||
    coalesce(p_contact_function, '') || ' ' ||
    coalesce(p_email, '') || ' ' ||
    coalesce(p_website, '') || ' ' ||
    coalesce(p_status, '') || ' ' ||
    coalesce(p_notes, '') || ' ' ||
    coalesce(p_phone_digits, '')
  );
$$;

CREATE OR REPLACE FUNCTION prospects_update_search_text()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_text := prospects_build_search_text(
    NEW.club_name,
    NEW.sport,
    NEW.canton,
    NEW.ville,
    NEW.contact_name,
    NEW.contact_function,
    NEW.email,
    NEW.website,
    NEW.status::text,
    NEW.notes,
    NEW.phone_digits
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_prospects_search_text ON prospects;
CREATE TRIGGER tg_prospects_search_text
  BEFORE INSERT OR UPDATE ON prospects
  FOR EACH ROW
  EXECUTE FUNCTION prospects_update_search_text();

UPDATE prospects SET updated_at = updated_at WHERE search_text IS NULL;

CREATE INDEX IF NOT EXISTS idx_prospects_user_search_text
  ON prospects (user_id, search_text text_pattern_ops);
