-- Rollback display data pre-computation tables

-- Drop triggers
DROP TRIGGER IF EXISTS update_participant_word_aggregates_updated_at ON participant_word_aggregates;
DROP TRIGGER IF EXISTS update_participant_word_second_aggregates_updated_at ON participant_word_second_aggregates;

-- Drop functions
DROP FUNCTION IF EXISTS update_word_aggregates_updated_at();
DROP FUNCTION IF EXISTS update_word_second_aggregates_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_word_aggregates_participant;
DROP INDEX IF EXISTS idx_word_aggregates_participant_word;
DROP INDEX IF EXISTS idx_word_second_aggregates_timestamp;
DROP INDEX IF EXISTS idx_word_second_aggregates_participant;
DROP INDEX IF EXISTS idx_word_second_aggregates_participant_word_second;

-- Remove columns from participant_timeline_cache
ALTER TABLE participant_timeline_cache
  DROP COLUMN IF EXISTS force_graph_metadata,
  DROP COLUMN IF EXISTS force_graph_data,
  DROP COLUMN IF EXISTS sampled_timeline_data;

-- Drop tables
DROP TABLE IF EXISTS participant_word_aggregates;
DROP TABLE IF EXISTS participant_word_second_aggregates;

