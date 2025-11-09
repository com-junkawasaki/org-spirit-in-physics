-- Drop triggers
DROP TRIGGER IF EXISTS update_participant_timeline_cache_updated_at ON participant_timeline_cache;
DROP TRIGGER IF EXISTS update_participant_timeline_batch_jobs_updated_at ON participant_timeline_batch_jobs;

-- Drop functions
DROP FUNCTION IF EXISTS update_timeline_cache_updated_at();
DROP FUNCTION IF EXISTS update_timeline_batch_jobs_updated_at();

-- Drop tables
DROP TABLE IF EXISTS participant_timeline_batch_jobs;
DROP TABLE IF EXISTS participant_timeline_cache;

