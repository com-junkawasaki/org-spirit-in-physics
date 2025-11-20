-- Merkle DAG: add_is_public_to_participants
-- Add is_public flag to participants table for public/private visibility control

-- Add is_public column with default true (existing data will be public)
ALTER TABLE participants 
ADD COLUMN is_public BOOLEAN DEFAULT true NOT NULL;

-- Ensure all existing data is marked as public
UPDATE participants SET is_public = true WHERE is_public IS NULL;

-- Create index for efficient filtering by is_public flag
CREATE INDEX idx_participants_is_public ON participants(is_public);

-- Add comment to document the column purpose
COMMENT ON COLUMN participants.is_public IS 'Flag indicating whether participant data can be accessed without authentication. When false, only authenticated researchers can access the data.';

