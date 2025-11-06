-- Drop tables in reverse order due to foreign key constraints
DROP TABLE IF EXISTS participant_analysis_results;
DROP TABLE IF EXISTS participant_response_data;
DROP TABLE IF EXISTS word_stimuli;
DROP TABLE IF EXISTS participant_experiment_sessions;
DROP TABLE IF EXISTS participant_consents;
DROP TABLE IF EXISTS participants;

-- Drop extensions (optional - usually not dropped in production)
-- DROP EXTENSION IF EXISTS "pg_trgm";
-- DROP EXTENSION IF EXISTS "uuid-ossp";
