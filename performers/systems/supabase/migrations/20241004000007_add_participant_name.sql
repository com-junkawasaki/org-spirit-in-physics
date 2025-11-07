-- Add name column to participants table for physiological data import
ALTER TABLE participants ADD COLUMN name TEXT;

-- Update the comment to reflect the change
COMMENT ON TABLE participants IS 'Participants in the Spirit is Physics experiment, with optional name for identification.';

-- Enable RLS for the new column (inherited from table RLS)
-- No additional policies needed as table-level RLS applies
