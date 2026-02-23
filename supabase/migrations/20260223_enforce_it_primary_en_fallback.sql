-- =============================================================
-- LANGUAGE STRATEGY ENFORCEMENT
-- =============================================================
-- Primary language: 'it' (Italiano) - always fixed system default
-- Mandatory fallback: 'en' (English) - always present in secondary_languages
-- Users can add additional optional languages on top of this base.
-- =============================================================

-- 1. Normalize all existing profiles:
--    - Set primary_language = 'it' for all where it differs
--    - Ensure 'en' is always present in secondary_languages
UPDATE public.profiles
SET 
  primary_language = 'it',
  secondary_languages = CASE
    WHEN 'en' = ANY(secondary_languages) THEN secondary_languages
    ELSE ARRAY['en'] || secondary_languages
  END
WHERE primary_language != 'it' OR NOT ('en' = ANY(secondary_languages));

-- 2. Update column defaults to enforce the strategy at DB level
ALTER TABLE public.profiles
  ALTER COLUMN primary_language SET DEFAULT 'it';

-- Note: secondary_languages default remains '{}' at DB level,
-- but the application layer always ensures 'en' is included.

-- 3. Update the handle_new_user trigger to always use 'it' as primary
--    and always include 'en' in secondary_languages
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_secondary TEXT[];
BEGIN
  -- Build secondary languages: always start with 'en', then add any extras from metadata
  v_secondary := ARRAY['en']::TEXT[];
  
  IF new.raw_user_meta_data->>'secondary_languages' IS NOT NULL THEN
    -- Merge metadata secondary languages (excluding 'it' primary and duplicates)
    SELECT ARRAY(
      SELECT DISTINCT unnest(
        v_secondary || ARRAY(
          SELECT jsonb_array_elements_text(new.raw_user_meta_data->'secondary_languages')
        )
      )
      WHERE unnest != 'it'  -- 'it' is always primary, never secondary
    ) INTO v_secondary;
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, primary_language, secondary_languages)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'it',           -- ALWAYS Italian as primary
    v_secondary     -- ALWAYS includes English as base fallback
  );
  RETURN new;
END;
$$;
