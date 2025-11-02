-- Supabase移行後のインデックス最適化
-- パフォーマンス向上のためのインデックス追加

-- 参加者テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_participants_created_at ON participants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_id ON participants(id);

-- セッションテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_sessions_participant_id ON participant_experiment_sessions(participant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON participant_experiment_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_participant_start ON participant_experiment_sessions(participant_id, start_time DESC);

-- 応答データテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_responses_participant_id ON participant_response_data(participant_id);
CREATE INDEX IF NOT EXISTS idx_responses_experiment_id ON participant_response_data(experiment_id);
CREATE INDEX IF NOT EXISTS idx_responses_timestamp ON participant_response_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_responses_participant_timestamp ON participant_response_data(participant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_responses_emotion ON participant_response_data(emotion) WHERE emotion IS NOT NULL;

-- 分析結果テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_analysis_participant_id ON participant_analysis_results(participant_id);
CREATE INDEX IF NOT EXISTS idx_analysis_experiment_id ON participant_analysis_results(experiment_id);
CREATE INDEX IF NOT EXISTS idx_analysis_spirit_probability ON participant_analysis_results(spirit_probability DESC);

-- 感情分析ジョブテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_hume_jobs_session_id ON participant_hume_analysis_jobs(participant_experiment_session_id);
CREATE INDEX IF NOT EXISTS idx_hume_jobs_status ON participant_hume_analysis_jobs(status);

-- 感情予測テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_hume_burst_job_id ON participant_hume_burst_predictions(job_id);
CREATE INDEX IF NOT EXISTS idx_hume_face_job_id ON participant_hume_face_predictions(job_id);
CREATE INDEX IF NOT EXISTS idx_hume_language_job_id ON participant_hume_language_predictions(job_id);
CREATE INDEX IF NOT EXISTS idx_hume_prosody_job_id ON participant_hume_prosody_predictions(job_id);

-- 同意テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_consents_participant_id ON participant_consents(participant_id);

-- 複合インデックス（よく使われるクエリパターン用）
CREATE INDEX IF NOT EXISTS idx_responses_participant_experiment ON participant_response_data(participant_id, experiment_id);
CREATE INDEX IF NOT EXISTS idx_analysis_participant_experiment ON participant_analysis_results(participant_id, experiment_id);

-- コメント: これらのインデックスは、よく使われるクエリパターンを最適化します
-- パフォーマンステストの結果に基づいて、必要に応じて追加・削除してください

