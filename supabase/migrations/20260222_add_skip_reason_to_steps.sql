-- Add skip_reason column to steps table
ALTER TABLE public.steps 
ADD COLUMN IF NOT EXISTS skip_reason TEXT;
