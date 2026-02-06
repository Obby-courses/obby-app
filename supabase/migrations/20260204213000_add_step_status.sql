-- Add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'steps' AND column_name = 'status') THEN
        ALTER TABLE steps ADD COLUMN status text DEFAULT 'pending';
        ALTER TABLE steps ADD CONSTRAINT status_check CHECK (status IN ('pending', 'completed', 'skipped'));
    END IF;
END $$;

-- Migrate existing boolean data to status if status is still pending/default
UPDATE steps 
SET status = 'completed' 
WHERE completed = true AND status = 'pending';

-- Drop the completed boolean column if you want to rely solely on status, 
-- BUT for now let's keep it synced or just ignore it in frontend to be safe.
-- We will update 'completed' column based on status for backward compatibility if needed,
-- or just stop using it in the frontend. 
-- For safety, let's make sure 'completed' maps to true if status is completed OR skipped (since user wants progression to continue)
-- but wait, usually 'completed' = true means done. Skipped is done too? 
-- User said: "funzionalità per l'utente saranno le stesse (scadenze, progressione)"
-- So implies Skipped allows progression.

-- Let's rely on the new 'status' column in the frontend.
