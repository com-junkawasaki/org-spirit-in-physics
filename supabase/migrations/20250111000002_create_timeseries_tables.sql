-- Merkle DAG: timeseries_tables -> timeline_points_hypertable
-- 時系列統合可視化用のTimescaleDBハイパーテーブル作成

-- Sessionsテーブル（既存のparticipant_experiment_sessionsを拡張または新規作成）
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  session_index INTEGER,
  start_ts BIGINT NOT NULL, -- Unix timestamp in milliseconds
  end_ts BIGINT,
  events JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant_id, session_index)
);

-- Timeline points テーブル（TimescaleDBハイパーテーブル）
CREATE TABLE IF NOT EXISTS timeline_points (
  time TIMESTAMPTZ NOT NULL, -- TimescaleDBパーティションキー
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  word TEXT,
  event_type TEXT,
  reaction_value DOUBLE PRECISION,
  reaction_time DOUBLE PRECISION,
  has_response BOOLEAN DEFAULT FALSE,
  emotions JSONB DEFAULT '[]',
  physiological JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ハイパーテーブルに変換（timeカラムでパーティショニング）
SELECT create_hypertable('timeline_points', 'time', if_not_exists => TRUE);

-- Continuous aggregate: 1時間単位の集計
CREATE MATERIALIZED VIEW IF NOT EXISTS timeline_hourly
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 hour', time) AS bucket,
  participant_id,
  session_id,
  AVG(reaction_value) as avg_reaction_value,
  MAX(reaction_value) as max_reaction_value,
  MIN(reaction_value) as min_reaction_value,
  AVG(reaction_time) as avg_reaction_time,
  COUNT(*) as event_count,
  COUNT(*) FILTER (WHERE has_response = TRUE) as response_count
FROM timeline_points
GROUP BY bucket, participant_id, session_id;

-- Continuous aggregate: 1日単位の集計
CREATE MATERIALIZED VIEW IF NOT EXISTS timeline_daily
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 day', time) AS bucket,
  participant_id,
  AVG(reaction_value) as avg_reaction_value,
  MAX(reaction_value) as max_reaction_value,
  MIN(reaction_value) as min_reaction_value,
  AVG(reaction_time) as avg_reaction_time,
  COUNT(*) as event_count,
  COUNT(*) FILTER (WHERE has_response = TRUE) as response_count
FROM timeline_points
GROUP BY bucket, participant_id;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_timeline_points_participant_time 
ON timeline_points (participant_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_points_session_time 
ON timeline_points (session_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_points_time 
ON timeline_points (time DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_participant_id 
ON sessions (participant_id);

CREATE INDEX IF NOT EXISTS idx_sessions_start_ts 
ON sessions (start_ts);

-- updated_at trigger
CREATE TRIGGER update_sessions_updated_at 
BEFORE UPDATE ON sessions 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

