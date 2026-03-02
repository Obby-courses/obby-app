-- Add is_published column to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

-- Update RLS policies to restrict searching/viewing unpublished courses
-- Existing policies in secure_data.sql:
-- create policy "Users can see their own courses." on courses for select using ( auth.uid() = user_id );

-- We keep the owner's policy as is so they can see their own course while generating.
-- However, we add an explicit index for performance.
CREATE INDEX IF NOT EXISTS idx_courses_is_published ON public.courses(is_published);
CREATE INDEX IF NOT EXISTS idx_courses_user_id_published ON public.courses(user_id, is_published);
