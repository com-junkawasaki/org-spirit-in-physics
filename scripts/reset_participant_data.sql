-- Reset participant data for participant ID: 144b325f-5966-4d59-a629-f2ca421388cc
-- This will delete the participant and all related data due to CASCADE DELETE constraints

-- Delete participant and all related data (CASCADE will handle related tables)
-- Related tables that will be automatically deleted:
-- - participant_consents
-- - participant_experiment_sessions
-- - participant_session_events
-- - participant_response_data (and all related emotion/physiological data)
-- - participant_analysis_results
-- - participant_timeline_cache
-- - participant_word_aggregates
-- - participant_word_second_aggregates
-- - participant_hume_analysis_jobs (and related tables)
-- - analysis_jobs (related to this participant)
-- - analysis_cache (related to this participant)

DELETE FROM participants WHERE id = '144b325f-5966-4d59-a629-f2ca421388cc';

-- Verify deletion
SELECT COUNT(*) as remaining_sessions 
FROM participant_experiment_sessions 
WHERE participant_id = '144b325f-5966-4d59-a629-f2ca421388cc';

