# Task Completed: Milestone Alignement Fix

The request to align milestone generation with taught skills has been implemented.

## Changes Applied

1.  **`create-milestone/index.ts` Updated**:
    *   The function now fetches steps directly from the database using `phaseId`.
    *   This ensures milestones rely on the Source of Truth (persisted steps) rather than potentially incomplete data from the request body.
    *   Fallback logic retains compatibility with direct step passing.

2.  **`prompts.ts` Updated**:
    *   `MILESTONE_GENERATOR` system prompt modified to restrict content to "ONLY skills explicitly learned".
    *   `USER_MILESTONE_PROMPT` now includes a "CRITICAL CONSTRAINTS" section and "GOOD/BAD" examples to enforce strict alignment.
    *   The prompt specifically lists "SKILLS TAUGHT" based on step descriptions.

## Expected Behavior
Milestones will now be strictly based on what the user has learned in the phase, plus a +10-20% challenge, avoiding "impossible leaps" like asking for a full song when only one chord was taught.

Please verify by generating a milestone in the app.
