-- Add verification_mode to courses table
ALTER TABLE IF EXISTS public.courses 
ADD COLUMN IF NOT EXISTS verification_mode TEXT;
