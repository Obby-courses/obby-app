-- Add avg_view_percentage and view_count to resources table
ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_view_percentage FLOAT DEFAULT 0;

-- Function to increment view and update average percentage atomically
CREATE OR REPLACE FUNCTION increment_resource_view(resource_id UUID, percentage FLOAT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.resources
  SET 
    -- Calculate new average: ((old_avg * old_count) + new_percentage) / (old_count + 1)
    avg_view_percentage = CASE 
        WHEN view_count = 0 THEN percentage
        ELSE ((avg_view_percentage * view_count) + percentage) / (view_count + 1)
    END,
    view_count = view_count + 1
  WHERE id = resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- EXAMPLE QUERY: Get average view percentage for a specific resource
-- SELECT avg_view_percentage FROM public.resources WHERE id = 'YOUR_RESOURCE_ID';
