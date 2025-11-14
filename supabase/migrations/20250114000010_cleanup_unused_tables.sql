-- Merkle DAG: cleanup -> remove_unused_tables
-- 未使用テーブルの削除または非推奨マーク

-- 注意: データが存在する場合は削除しないこと

-- participant_experiment_sessionsテーブルを削除（0件、sessionsに統合済み）
-- 外部キー制約を先に削除
ALTER TABLE sessions 
DROP CONSTRAINT IF EXISTS sessions_experiment_session_id_fkey;

ALTER TABLE participant_hume_analysis_jobs
DROP CONSTRAINT IF EXISTS participant_hume_analysis_job_participant_experiment_sessi_fkey;

-- participant_experiment_sessionsテーブルを削除
DROP TABLE IF EXISTS participant_experiment_sessions CASCADE;

-- 未使用のHume AIテーブルを削除（0件）
DROP TABLE IF EXISTS participant_hume_burst_predictions CASCADE;
DROP TABLE IF EXISTS participant_hume_language_predictions CASCADE;
DROP TABLE IF EXISTS participant_hume_prosody_predictions CASCADE;
DROP TABLE IF EXISTS participant_hume_analysis_jobs CASCADE;

-- 未使用の時系列テーブルを削除（0件）
DROP TABLE IF EXISTS response_skin_potential_timeseries CASCADE;
DROP TABLE IF EXISTS response_emotion_timeseries CASCADE;

-- 未使用の分析テーブルを削除（0件、または使用予定がない場合）
-- 注意: analysis_resultsとparticipant_analysis_resultsは用途が異なる可能性があるため、削除しない
-- DROP TABLE IF EXISTS analysis_results CASCADE;
-- DROP TABLE IF EXISTS analysis_runs CASCADE;

-- コメントを追加して非推奨を明示（削除しない場合）
COMMENT ON TABLE analysis_results IS 'DEPRECATED: Use participant_analysis_results instead. This table is kept for backward compatibility.';
COMMENT ON TABLE analysis_runs IS 'DEPRECATED: May be removed in future versions if not used.';

