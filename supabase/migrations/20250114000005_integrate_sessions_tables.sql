-- Merkle DAG: sessions_integration -> unified_sessions_table
-- sessionsテーブルとparticipant_experiment_sessionsテーブルの統合

-- sessionsテーブルにsession_typeカラムを追加
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS session_type session_type;

-- sessionsテーブルにstart_timeとend_timeカラムを追加（TIMESTAMPTZ）
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE;

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;

-- start_tsからstart_timeを計算（Unix timestamp in milliseconds → TIMESTAMPTZ）
UPDATE sessions 
SET start_time = to_timestamp(start_ts / 1000.0)
WHERE start_time IS NULL AND start_ts IS NOT NULL;

-- end_tsからend_timeを計算
UPDATE sessions 
SET end_time = to_timestamp(end_ts / 1000.0)
WHERE end_time IS NULL AND end_ts IS NOT NULL;

-- participant_experiment_sessionsからsession_typeを移行（データがある場合）
-- 現在はparticipant_experiment_sessionsが0件のため、この処理はスキップ

-- participant_hume_analysis_jobsの外部キーをsessionsに変更（テーブルが存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'participant_hume_analysis_jobs'
  ) THEN
    ALTER TABLE participant_hume_analysis_jobs
    DROP CONSTRAINT IF EXISTS participant_hume_analysis_job_participant_experiment_sessi_fkey;

    ALTER TABLE participant_hume_analysis_jobs
    ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE CASCADE;

    UPDATE participant_hume_analysis_jobs phaj
    SET session_id = s.id
    FROM sessions s
    WHERE phaj.participant_experiment_session_id IS NOT NULL
      AND s.experiment_session_id = phaj.participant_experiment_session_id
      AND phaj.session_id IS NULL;

    CREATE INDEX IF NOT EXISTS idx_participant_hume_analysis_jobs_session_id ON participant_hume_analysis_jobs(session_id);
  END IF;
END $$;

-- participant_analysis_resultsのexperiment_idをsessions.idに変更（テーブルが存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'participant_analysis_results'
  ) THEN
    ALTER TABLE participant_analysis_results
    ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_participant_analysis_results_session_id ON participant_analysis_results(session_id);
  END IF;
END $$;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_sessions_session_type ON sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_end_time ON sessions(end_time);

