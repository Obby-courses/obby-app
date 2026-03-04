-- Add status_changed_at column to steps table
-- This records when a step last changed status (completed, skipped, or reverted to pending)
-- Used to calculate if the step was acted upon within its deadline (streak logic)
ALTER TABLE public.steps
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;
