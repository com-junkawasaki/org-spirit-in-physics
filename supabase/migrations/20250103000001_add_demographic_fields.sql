-- Add demographic and consent metadata fields to participants and participant_consents tables
-- Merkle DAG: database.migration.demographic_fields

-- Add demographic fields to participants table
ALTER TABLE participants 
  ADD COLUMN IF NOT EXISTS ethnicity TEXT,
  ADD COLUMN IF NOT EXISTS income TEXT,
  ADD COLUMN IF NOT EXISTS consent_version TEXT DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS study_id TEXT DEFAULT 'SPIRIT-IN-PHYSICS-2025';

-- Add consent metadata fields to participant_consents table
ALTER TABLE participant_consents
  ADD COLUMN IF NOT EXISTS consent_version TEXT DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS study_id TEXT DEFAULT 'SPIRIT-IN-PHYSICS-2025',
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS consent_text TEXT;

-- Update age column to support age groups (keep as INTEGER for backward compatibility, but add comment)
COMMENT ON COLUMN participants.age IS 'Age as integer or age group (e.g., "18-24", "25-34")';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_participants_ethnicity ON participants(ethnicity);
CREATE INDEX IF NOT EXISTS idx_participants_income ON participants(income);
CREATE INDEX IF NOT EXISTS idx_participants_study_id ON participants(study_id);
CREATE INDEX IF NOT EXISTS idx_participant_consents_consent_version ON participant_consents(consent_version);
CREATE INDEX IF NOT EXISTS idx_participant_consents_study_id ON participant_consents(study_id);

-- Add comments for documentation
COMMENT ON COLUMN participants.ethnicity IS 'Participant ethnicity (CDISC standard)';
COMMENT ON COLUMN participants.income IS 'Participant annual income range (CDISC standard)';
COMMENT ON COLUMN participants.consent_version IS 'Version of the consent form used';
COMMENT ON COLUMN participants.study_id IS 'Identifier for the research study';
COMMENT ON COLUMN participant_consents.consent_version IS 'Version of the consent form used';
COMMENT ON COLUMN participant_consents.study_id IS 'Identifier for the research study';
COMMENT ON COLUMN participant_consents.user_agent IS 'User agent string from the browser';
COMMENT ON COLUMN participant_consents.ip_address IS 'IP address of the participant (for compliance)';
COMMENT ON COLUMN participant_consents.consent_text IS 'Full text of the consent form';

