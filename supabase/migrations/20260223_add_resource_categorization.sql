-- ============================================================
-- Migration: 3-Level Resource Categorization System
-- Adds semantic tagging columns to the resources table
-- ============================================================

-- LEVEL 1: Domain Classification
ALTER TABLE resources ADD COLUMN IF NOT EXISTS domain TEXT NOT NULL DEFAULT 'other';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS subdomain TEXT;

-- LEVEL 2: Primary Topics (structured array, max 5)
ALTER TABLE resources ADD COLUMN IF NOT EXISTS primary_topics JSONB NOT NULL DEFAULT '[]'::JSONB;

-- LEVEL 3: Contextual Metadata
ALTER TABLE resources ADD COLUMN IF NOT EXISTS skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced'));
ALTER TABLE resources ADD COLUMN IF NOT EXISTS learning_objectives TEXT[] DEFAULT '{}';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS prerequisites TEXT[] DEFAULT '{}';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'it' CHECK (language IN ('it', 'en', 'es', 'fr', 'de', 'other'));

-- Searchable text (auto-generated from above fields)
ALTER TABLE resources ADD COLUMN IF NOT EXISTS searchable_text TEXT;

-- Constraint: max 5 primary topics
ALTER TABLE resources ADD CONSTRAINT valid_primary_topics CHECK (jsonb_array_length(primary_topics) <= 5);

-- Indexes for performant queries
CREATE INDEX IF NOT EXISTS idx_resources_domain ON resources(domain);
CREATE INDEX IF NOT EXISTS idx_resources_primary_topics ON resources USING GIN(primary_topics);
CREATE INDEX IF NOT EXISTS idx_resources_skill_level ON resources(skill_level);
CREATE INDEX IF NOT EXISTS idx_resources_search ON resources USING GIN(to_tsvector('italian', COALESCE(searchable_text, '')));
