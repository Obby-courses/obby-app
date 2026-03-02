-- Add order_index to milestones table
ALTER TABLE public.milestones 
ADD COLUMN IF NOT EXISTS order_index INTEGER;
