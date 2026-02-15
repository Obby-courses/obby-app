-- Add resource_id column to milestones table to link directly to the resources table
ALTER TABLE public.milestones 
ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_milestones_resource_id ON public.milestones(resource_id);
