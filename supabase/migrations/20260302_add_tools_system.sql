-- Aggiunta supporto per Strumenti & Attrezzatura
-- Migrazione: 20260302_add_tools_system.sql

-- 1. Aggiunta colonna tools ai profili utenti
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tools TEXT[] DEFAULT '{}';

-- 2. Aggiunta colonna required_tools alle macro-fasi dei corsi
-- Nota: assumiamo che la tabella macro_phases esista (già verificata in secure_data.sql)
ALTER TABLE public.macro_phases
ADD COLUMN IF NOT EXISTS required_tools TEXT[] DEFAULT '{}';

-- 3. Aggiornamento della funzione handle_new_user per gestire i default dei nuovi utenti
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    avatar_url, 
    primary_language, 
    secondary_languages,
    tools
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'primary_language', 'it'),
    CASE
      WHEN new.raw_user_meta_data->>'secondary_languages' IS NOT NULL
      THEN ARRAY(SELECT jsonb_array_elements_text(new.raw_user_meta_data->'secondary_languages'))
      ELSE ARRAY['en']::TEXT[]
    END,
    '{}'::TEXT[]
  );
  RETURN new;
END;
$$;
