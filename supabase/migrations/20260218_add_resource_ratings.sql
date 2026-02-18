-- 1. Add rating columns and a tracking map to resources table
ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS avg_rating FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ratings_map JSONB DEFAULT '{}'::jsonb;

-- 2. RPC function for rating with JSONB deduplication
CREATE OR REPLACE FUNCTION rate_resource(resource_id UUID, rating INTEGER)
RETURNS VOID AS $$
DECLARE
    current_user_id TEXT := auth.uid()::text;
    old_rating INTEGER;
    new_ratings_map JSONB;
BEGIN
    -- 1. Get current map and check for old rating
    SELECT ratings_map INTO new_ratings_map 
    FROM public.resources 
    WHERE id = resource_id;

    old_rating := (new_ratings_map->>current_user_id)::INTEGER;

    -- 2. Update the map with the new rating
    new_ratings_map := jsonb_set(new_ratings_map, ARRAY[current_user_id], to_jsonb(rating));

    -- 3. Update the resource columns
    IF old_rating IS NULL THEN
        -- Case: New voter
        UPDATE public.resources
        SET 
            avg_rating = CASE 
                WHEN rating_count = 0 THEN rating
                ELSE ((avg_rating * rating_count) + rating) / (rating_count + 1)
            END,
            rating_count = rating_count + 1,
            ratings_map = new_ratings_map
        WHERE id = resource_id;
    ELSE
        -- Case: Existing voter (Delta update)
        UPDATE public.resources
        SET 
            avg_rating = ((avg_rating * rating_count) - old_rating + rating) / rating_count,
            ratings_map = new_ratings_map
        WHERE id = resource_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
