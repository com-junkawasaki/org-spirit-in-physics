-- Merkle DAG: emotion_tables -> timescaledb_hypertables
-- 感情データ用のTimescaleDBハイパーテーブル作成

-- Burst emotion data (vocal expressions)
CREATE TABLE IF NOT EXISTS burst_emotion_data (
  time TIMESTAMPTZ NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  record_id TEXT,
  begin_time DOUBLE PRECISION NOT NULL,
  end_time DOUBLE PRECISION NOT NULL,
  emotion_scores JSONB DEFAULT '{}',
  vocal_types JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Face emotion data
CREATE TABLE IF NOT EXISTS face_emotion_data (
  time TIMESTAMPTZ NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
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

-- Language emotion data (from transcript)
CREATE TABLE IF NOT EXISTS language_emotion_data (
  time TIMESTAMPTZ NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  record_id TEXT,
  text TEXT,
  begin_time DOUBLE PRECISION NOT NULL,
  end_time DOUBLE PRECISION NOT NULL,
  emotion_scores JSONB DEFAULT '{}',
  toxicity_scores JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prosody emotion data
CREATE TABLE IF NOT EXISTS prosody_emotion_data (
  time TIMESTAMPTZ NOT NULL,
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  record_id TEXT,
  begin_time DOUBLE PRECISION NOT NULL,
  emotion_scores JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ハイパーテーブルに変換
SELECT create_hypertable('burst_emotion_data', 'time', if_not_exists => TRUE);
SELECT create_hypertable('face_emotion_data', 'time', if_not_exists => TRUE);
SELECT create_hypertable('language_emotion_data', 'time', if_not_exists => TRUE);
SELECT create_hypertable('prosody_emotion_data', 'time', if_not_exists => TRUE);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_burst_emotion_session_time 
ON burst_emotion_data (session_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_burst_emotion_participant_time 
ON burst_emotion_data (participant_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_face_emotion_session_time 
ON face_emotion_data (session_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_face_emotion_participant_time 
ON face_emotion_data (participant_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_language_emotion_session_time 
ON language_emotion_data (session_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_language_emotion_participant_time 
ON language_emotion_data (participant_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_prosody_emotion_session_time 
ON prosody_emotion_data (session_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_prosody_emotion_participant_time 
ON prosody_emotion_data (participant_id, time DESC);

