-- Add language preferences to user profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_language TEXT NOT NULL DEFAULT 'it',
  ADD COLUMN IF NOT EXISTS secondary_languages TEXT[] NOT NULL DEFAULT '{}';

-- Update the handle_new_user trigger to set default language from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, primary_language, secondary_languages)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'primary_language', 'it'),
    CASE
      WHEN new.raw_user_meta_data->>'secondary_languages' IS NOT NULL
      THEN ARRAY(SELECT jsonb_array_elements_text(new.raw_user_meta_data->'secondary_languages'))
      ELSE ARRAY['en']::TEXT[]
    END
  );
  RETURN new;
END;
$$;
