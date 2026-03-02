-- Add keywords column as JSONB to phases table
ALTER TABLE public.phases ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'::jsonb;

-- Remove description column from phases table
ALTER TABLE public.phases DROP COLUMN IF EXISTS description;

-- Optional: Add a comment to describe the structure
COMMENT ON COLUMN public.phases.keywords IS 'List of technical keywords and concepts for the phase, stored as a JSON array.';
