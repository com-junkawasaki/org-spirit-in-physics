-- Merkle DAG: rename_hume_tables -> hume_prefix_and_no_fk
-- Hume由来の感情系テーブルをhume_プレフィックスに変更し、外部キー参照を削除

-- 1. 依存するビューとマテリアライズドビューを一時的に削除
DROP MATERIALIZED VIEW IF EXISTS timeline_emotion_vectors_by_word CASCADE;
DROP VIEW IF EXISTS session_detail CASCADE;
DROP VIEW IF EXISTS participant_detail CASCADE;
DROP VIEW IF EXISTS participant_summary CASCADE;

-- 2. 新しいテーブル名でテーブルを作成（外部キー制約なし）
-- hume_burst_emotion_data
CREATE TABLE IF NOT EXISTS hume_burst_emotion_data (
  time TIMESTAMPTZ NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL, -- 外部キー制約なし
  participant_id UUID NOT NULL, -- 外部キー制約なし
  record_id TEXT,
  begin_time DOUBLE PRECISION NOT NULL,
  end_time DOUBLE PRECISION NOT NULL,
  emotion_scores JSONB DEFAULT '{}',
  vocal_types JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- hume_face_emotion_data
CREATE TABLE IF NOT EXISTS hume_face_emotion_data (
  time TIMESTAMPTZ NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL, -- 外部キー制約なし
  participant_id UUID NOT NULL, -- 外部キー制約なし
  record_id TEXT,
  frame INTEGER,
  begin_time DOUBLE PRECISION NOT NULL,
  emotion_scores JSONB DEFAULT '{}',
  au_scores JSONB DEFAULT '{}', -- Action Unit scores
  probability DOUBLE PRECISION,
  face_x0 INTEGER,
  face_y0 INTEGER,
  face_width INTEGER,
  face_height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- hume_language_emotion_data
CREATE TABLE IF NOT EXISTS hume_language_emotion_data (
  time TIMESTAMPTZ NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL, -- 外部キー制約なし
  participant_id UUID NOT NULL, -- 外部キー制約なし
  record_id TEXT,
  text TEXT,
  begin_time DOUBLE PRECISION NOT NULL,
  end_time DOUBLE PRECISION NOT NULL,
  emotion_scores JSONB DEFAULT '{}',
  toxicity_scores JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- hume_prosody_emotion_data
CREATE TABLE IF NOT EXISTS hume_prosody_emotion_data (
  time TIMESTAMPTZ NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL, -- 外部キー制約なし
  participant_id UUID NOT NULL, -- 外部キー制約なし
  record_id TEXT,
  begin_time DOUBLE PRECISION NOT NULL,
  emotion_scores JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ハイパーテーブルに変換（TimescaleDBが有効な場合）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('hume_burst_emotion_data', 'time', if_not_exists => TRUE);
        PERFORM create_hypertable('hume_face_emotion_data', 'time', if_not_exists => TRUE);
        PERFORM create_hypertable('hume_language_emotion_data', 'time', if_not_exists => TRUE);
        PERFORM create_hypertable('hume_prosody_emotion_data', 'time', if_not_exists => TRUE);
        RAISE NOTICE 'Converted to hypertables';
    END IF;
END $$;

-- 4. インデックス作成
CREATE INDEX IF NOT EXISTS idx_hume_burst_emotion_session_time 
ON hume_burst_emotion_data (session_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_hume_burst_emotion_participant_time 
ON hume_burst_emotion_data (participant_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_hume_face_emotion_session_time 
ON hume_face_emotion_data (session_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_hume_face_emotion_participant_time 
ON hume_face_emotion_data (participant_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_hume_language_emotion_session_time 
ON hume_language_emotion_data (session_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_hume_language_emotion_participant_time 
ON hume_language_emotion_data (participant_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_hume_prosody_emotion_session_time 
ON hume_prosody_emotion_data (session_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_hume_prosody_emotion_participant_time 
ON hume_prosody_emotion_data (participant_id, time DESC);

-- 5. データ移行（既存データを新しいテーブルにコピー）
-- 注意: 既存テーブルが存在する場合のみ移行
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'burst_emotion_data') THEN
        INSERT INTO hume_burst_emotion_data (
            time, id, session_id, participant_id, record_id,
            begin_time, end_time, emotion_scores, vocal_types, created_at
        )
        SELECT 
            time, id, session_id, participant_id, record_id,
            begin_time, end_time, emotion_scores, vocal_types, created_at
        FROM burst_emotion_data
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Migrated data from burst_emotion_data to hume_burst_emotion_data';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'face_emotion_data') THEN
        INSERT INTO hume_face_emotion_data (
            time, id, session_id, participant_id, record_id,
            frame, begin_time, emotion_scores, au_scores, probability,
            face_x0, face_y0, face_width, face_height, created_at
        )
        SELECT 
            time, id, session_id, participant_id, record_id,
            frame, begin_time, emotion_scores, au_scores, probability,
            face_x0, face_y0, face_width, face_height, created_at
        FROM face_emotion_data
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Migrated data from face_emotion_data to hume_face_emotion_data';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'language_emotion_data') THEN
        INSERT INTO hume_language_emotion_data (
            time, id, session_id, participant_id, record_id,
            text, begin_time, end_time, emotion_scores, toxicity_scores, created_at
        )
        SELECT 
            time, id, session_id, participant_id, record_id,
            text, begin_time, end_time, emotion_scores, toxicity_scores, created_at
        FROM language_emotion_data
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Migrated data from language_emotion_data to hume_language_emotion_data';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prosody_emotion_data') THEN
        INSERT INTO hume_prosody_emotion_data (
            time, id, session_id, participant_id, record_id,
            begin_time, emotion_scores, created_at
        )
        SELECT 
            time, id, session_id, participant_id, record_id,
            begin_time, emotion_scores, created_at
        FROM prosody_emotion_data
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Migrated data from prosody_emotion_data to hume_prosody_emotion_data';
    END IF;
END $$;

-- 6. 感情スコアテーブルを新しいテーブル名に変更
-- hume_burst_emotion_scores
CREATE TABLE IF NOT EXISTS hume_burst_emotion_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hume_burst_emotion_data_id UUID NOT NULL, -- 外部キー制約なし
  emotion_name_id INTEGER NOT NULL REFERENCES emotion_names(id) ON DELETE CASCADE,
  score DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(hume_burst_emotion_data_id, emotion_name_id)
);

-- hume_face_emotion_scores
CREATE TABLE IF NOT EXISTS hume_face_emotion_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hume_face_emotion_data_id UUID NOT NULL, -- 外部キー制約なし
  emotion_name_id INTEGER NOT NULL REFERENCES emotion_names(id) ON DELETE CASCADE,
  score DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(hume_face_emotion_data_id, emotion_name_id)
);

-- hume_language_emotion_scores
CREATE TABLE IF NOT EXISTS hume_language_emotion_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hume_language_emotion_data_id UUID NOT NULL, -- 外部キー制約なし
  emotion_name_id INTEGER NOT NULL REFERENCES emotion_names(id) ON DELETE CASCADE,
  score DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(hume_language_emotion_data_id, emotion_name_id)
);

-- hume_prosody_emotion_scores
CREATE TABLE IF NOT EXISTS hume_prosody_emotion_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hume_prosody_emotion_data_id UUID NOT NULL, -- 外部キー制約なし
  emotion_name_id INTEGER NOT NULL REFERENCES emotion_names(id) ON DELETE CASCADE,
  score DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(hume_prosody_emotion_data_id, emotion_name_id)
);

-- 7. 感情スコアデータを移行（既存テーブルが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'burst_emotion_scores') THEN
        INSERT INTO hume_burst_emotion_scores (id, hume_burst_emotion_data_id, emotion_name_id, score, created_at)
        SELECT id, burst_emotion_data_id, emotion_name_id, score, created_at
        FROM burst_emotion_scores
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Migrated data from burst_emotion_scores to hume_burst_emotion_scores';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'face_emotion_scores') THEN
        INSERT INTO hume_face_emotion_scores (id, hume_face_emotion_data_id, emotion_name_id, score, created_at)
        SELECT id, face_emotion_data_id, emotion_name_id, score, created_at
        FROM face_emotion_scores
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Migrated data from face_emotion_scores to hume_face_emotion_scores';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'language_emotion_scores') THEN
        INSERT INTO hume_language_emotion_scores (id, hume_language_emotion_data_id, emotion_name_id, score, created_at)
        SELECT id, language_emotion_data_id, emotion_name_id, score, created_at
        FROM language_emotion_scores
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Migrated data from language_emotion_scores to hume_language_emotion_scores';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prosody_emotion_scores') THEN
        INSERT INTO hume_prosody_emotion_scores (id, hume_prosody_emotion_data_id, emotion_name_id, score, created_at)
        SELECT id, prosody_emotion_data_id, emotion_name_id, score, created_at
        FROM prosody_emotion_scores
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Migrated data from prosody_emotion_scores to hume_prosody_emotion_scores';
    END IF;
END $$;

-- 8. インデックス作成（感情スコアテーブル）
CREATE INDEX IF NOT EXISTS idx_hume_burst_emotion_scores_data_id 
ON hume_burst_emotion_scores(hume_burst_emotion_data_id);

CREATE INDEX IF NOT EXISTS idx_hume_burst_emotion_scores_emotion_name 
ON hume_burst_emotion_scores(emotion_name_id);

CREATE INDEX IF NOT EXISTS idx_hume_face_emotion_scores_data_id 
ON hume_face_emotion_scores(hume_face_emotion_data_id);

CREATE INDEX IF NOT EXISTS idx_hume_face_emotion_scores_emotion_name 
ON hume_face_emotion_scores(emotion_name_id);

CREATE INDEX IF NOT EXISTS idx_hume_language_emotion_scores_data_id 
ON hume_language_emotion_scores(hume_language_emotion_data_id);

CREATE INDEX IF NOT EXISTS idx_hume_language_emotion_scores_emotion_name 
ON hume_language_emotion_scores(emotion_name_id);

CREATE INDEX IF NOT EXISTS idx_hume_prosody_emotion_scores_data_id 
ON hume_prosody_emotion_scores(hume_prosody_emotion_data_id);

CREATE INDEX IF NOT EXISTS idx_hume_prosody_emotion_scores_emotion_name 
ON hume_prosody_emotion_scores(emotion_name_id);

-- 9. 古いテーブルを削除（依存関係を解除してから）
DROP TABLE IF EXISTS burst_emotion_scores CASCADE;
DROP TABLE IF EXISTS face_emotion_scores CASCADE;
DROP TABLE IF EXISTS language_emotion_scores CASCADE;
DROP TABLE IF EXISTS prosody_emotion_scores CASCADE;

DROP TABLE IF EXISTS burst_emotion_data CASCADE;
DROP TABLE IF EXISTS face_emotion_data CASCADE;
DROP TABLE IF EXISTS language_emotion_data CASCADE;
DROP TABLE IF EXISTS prosody_emotion_data CASCADE;

-- 10. コメント追加
COMMENT ON TABLE hume_burst_emotion_data IS 'Hume AI burst emotion data (vocal expressions). No foreign key constraints - application-level integrity.';
COMMENT ON TABLE hume_face_emotion_data IS 'Hume AI face emotion data. No foreign key constraints - application-level integrity.';
COMMENT ON TABLE hume_language_emotion_data IS 'Hume AI language emotion data (from transcript). No foreign key constraints - application-level integrity.';
COMMENT ON TABLE hume_prosody_emotion_data IS 'Hume AI prosody emotion data. No foreign key constraints - application-level integrity.';

COMMENT ON TABLE hume_burst_emotion_scores IS 'Normalized emotion scores for hume_burst_emotion_data. References hume_burst_emotion_data_id without foreign key constraint.';
COMMENT ON TABLE hume_face_emotion_scores IS 'Normalized emotion scores for hume_face_emotion_data. References hume_face_emotion_data_id without foreign key constraint.';
COMMENT ON TABLE hume_language_emotion_scores IS 'Normalized emotion scores for hume_language_emotion_data. References hume_language_emotion_data_id without foreign key constraint.';
COMMENT ON TABLE hume_prosody_emotion_scores IS 'Normalized emotion scores for hume_prosody_emotion_data. References hume_prosody_emotion_data_id without foreign key constraint.';

