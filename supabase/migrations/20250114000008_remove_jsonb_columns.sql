-- Merkle DAG: jsonb_removal -> normalized_schema_finalization
-- JSONBカラムを削除し、正規化テーブルへの外部キーに置き換え

-- 注意: このマイグレーションは既存データの移行が完了した後に実行すること

-- 1. burst_emotion_dataからJSONBカラムを削除
ALTER TABLE burst_emotion_data 
DROP COLUMN IF EXISTS emotion_scores;

ALTER TABLE burst_emotion_data 
DROP COLUMN IF EXISTS vocal_types;

-- 2. face_emotion_dataからJSONBカラムを削除
ALTER TABLE face_emotion_data 
DROP COLUMN IF EXISTS emotion_scores;

ALTER TABLE face_emotion_data 
DROP COLUMN IF EXISTS au_scores;

-- 3. language_emotion_dataからJSONBカラムを削除
ALTER TABLE language_emotion_data 
DROP COLUMN IF EXISTS emotion_scores;

ALTER TABLE language_emotion_data 
DROP COLUMN IF EXISTS toxicity_scores;

-- 4. prosody_emotion_dataからJSONBカラムを削除
ALTER TABLE prosody_emotion_data 
DROP COLUMN IF EXISTS emotion_scores;

-- 5. timeline_pointsからJSONBカラムを削除
ALTER TABLE timeline_points 
DROP COLUMN IF EXISTS emotions;

ALTER TABLE timeline_points 
DROP COLUMN IF EXISTS physiological;

ALTER TABLE timeline_points 
DROP COLUMN IF EXISTS metadata;

-- 6. sessionsからJSONBカラムを削除
ALTER TABLE sessions 
DROP COLUMN IF EXISTS events;

-- 7. participant_consentsからJSONBカラムを削除
ALTER TABLE participant_consents 
DROP COLUMN IF EXISTS agreements;

-- 8. participant_analysis_resultsからJSONBカラムを削除
ALTER TABLE participant_analysis_results 
DROP COLUMN IF EXISTS emotion_data;

ALTER TABLE participant_analysis_results 
DROP COLUMN IF EXISTS physiological_data;

-- 9. analysis_runsからJSONBカラムを削除
ALTER TABLE analysis_runs 
DROP COLUMN IF EXISTS parameters;

-- 10. analysis_resultsからJSONBカラムを削除
ALTER TABLE analysis_results 
DROP COLUMN IF EXISTS raw_inputs;

-- 11. analysis_jobsからJSONBカラムを削除
ALTER TABLE analysis_jobs 
DROP COLUMN IF EXISTS metadata;

-- 12. analysis_cacheからJSONBカラムを削除
ALTER TABLE analysis_cache 
DROP COLUMN IF EXISTS cache_value;

-- 13. participant_hume_burst_predictionsからJSONBカラムを削除（未使用テーブル）
ALTER TABLE participant_hume_burst_predictions 
DROP COLUMN IF EXISTS emotions;

ALTER TABLE participant_hume_burst_predictions 
DROP COLUMN IF EXISTS expressions;

-- 14. participant_hume_language_predictionsからJSONBカラムを削除（未使用テーブル）
ALTER TABLE participant_hume_language_predictions 
DROP COLUMN IF EXISTS emotions;

ALTER TABLE participant_hume_language_predictions 
DROP COLUMN IF EXISTS toxicity;

-- 15. participant_hume_prosody_predictionsからJSONBカラムを削除（未使用テーブル）
ALTER TABLE participant_hume_prosody_predictions 
DROP COLUMN IF EXISTS features;

ALTER TABLE participant_hume_prosody_predictions 
DROP COLUMN IF EXISTS emotions;

-- 16. response_emotion_timeseriesからJSONBカラムを削除（未使用テーブル）
ALTER TABLE response_emotion_timeseries 
DROP COLUMN IF EXISTS emotion_data;

-- JSONBインデックスを削除（GINインデックス）
DROP INDEX IF EXISTS idx_burst_emotion_scores_gin;
DROP INDEX IF EXISTS idx_face_emotion_scores_gin;
DROP INDEX IF EXISTS idx_language_emotion_scores_gin;
DROP INDEX IF EXISTS idx_prosody_emotion_scores_gin;
DROP INDEX IF EXISTS idx_timeline_points_emotions_gin;
DROP INDEX IF EXISTS idx_timeline_points_physiological_gin;

