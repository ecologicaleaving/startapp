-- Migration 006: Add tournament type column
-- This migration adds the missing 'type' column to the tournaments table
-- to support filtering by tournament type (FIVB, BPT, CEV, LOCAL, etc.)

-- Add the type column to tournaments table
ALTER TABLE tournaments ADD COLUMN type VARCHAR;

-- Create index for performance optimization
CREATE INDEX idx_tournaments_type ON tournaments(type);

-- Add comment explaining the column
COMMENT ON COLUMN tournaments.type IS 'Tournament type/category (FIVB, BPT, CEV, LOCAL, etc.)';

-- Update schema version
INSERT INTO schema_versions (version, description) VALUES
('1.1.0', 'Added type column to tournaments table for tournament category filtering')
ON CONFLICT (version) DO NOTHING;