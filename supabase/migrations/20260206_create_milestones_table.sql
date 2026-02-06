-- Create milestones table
CREATE TABLE IF NOT EXISTS public.milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES public.phases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    milestone_type TEXT NOT NULL, -- 'target_metric', 'media_upload', 'external_link'
    target_config JSONB DEFAULT '{}'::jsonb, -- Flexible configuration
    completed BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(phase_id) -- Ensure only one milestone per phase
);

-- Enable Row Level Security
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- Policies (Cascading access via phases -> macro_phases -> courses)

-- Pattern matching "secure_data.sql" exactly for steps
CREATE POLICY "Access milestones if phase is accessible."
    ON public.milestones
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM public.phases p
            JOIN public.macro_phases mp ON p.macro_phase_id = mp.id
            JOIN public.courses c ON mp.course_id = c.id
            WHERE p.id = public.milestones.phase_id
            AND c.user_id = auth.uid()
        )
    );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_milestones_phase_id ON public.milestones(phase_id);
CREATE INDEX IF NOT EXISTS idx_milestones_course_id ON public.milestones(course_id);
