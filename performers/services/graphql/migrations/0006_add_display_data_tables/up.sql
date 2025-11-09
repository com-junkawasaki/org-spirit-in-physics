-- Display data pre-computation tables
-- Adds tables for word-second aggregates, word aggregates, and extends timeline cache

-- 1. Word-second aggregates table (単語区間・1秒単位テーブル)
CREATE TABLE participant_word_second_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  stimulus_word TEXT NOT NULL,
  second_timestamp TIMESTAMPTZ NOT NULL,  -- 1秒単位のタイムスタンプ
  reaction_time_stats JSONB NOT NULL DEFAULT '{}',  -- {avg, std_dev, max, min, count}
  emotion_stats JSONB NOT NULL DEFAULT '{}',  -- 各感情の{avg, std_dev, max, min, count}
  physiological_stats JSONB NOT NULL DEFAULT '{}',  -- {avg, std_dev, max, min, count}
  response_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, stimulus_word, second_timestamp)
);

-- 2. Word aggregates table (集計データテーブル)
CREATE TABLE participant_word_aggregates (
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  stimulus_word TEXT NOT NULL,
  reaction_time_stats JSONB NOT NULL DEFAULT '{}',  -- {avg, std_dev, max, min, count, median}
  emotion_stats JSONB NOT NULL DEFAULT '{}',  -- 各感情の{avg, std_dev, max, min, count}
  physiological_stats JSONB NOT NULL DEFAULT '{}',  -- {avg, std_dev, max, min, count}
  total_responses INTEGER NOT NULL DEFAULT 0,
  total_seconds INTEGER NOT NULL DEFAULT 0,
  first_occurrence TIMESTAMPTZ,
  last_occurrence TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (participant_id, stimulus_word)
);

-- 3. Extend participant_timeline_cache table
ALTER TABLE participant_timeline_cache
  ADD COLUMN IF NOT EXISTS sampled_timeline_data JSONB,  -- サンプリング済み2000ポイント
  ADD COLUMN IF NOT EXISTS force_graph_data JSONB,  -- 3D Forceグラフ用集約データ（100ノード、最大4950リンク）
  ADD COLUMN IF NOT EXISTS force_graph_metadata JSONB;  -- グラフのメタデータ

-- Indexes for efficient queries
CREATE INDEX idx_word_second_aggregates_participant_word_second 
  ON participant_word_second_aggregates(participant_id, stimulus_word, second_timestamp);
CREATE INDEX idx_word_second_aggregates_participant 
  ON participant_word_second_aggregates(participant_id);
CREATE INDEX idx_word_second_aggregates_timestamp 
  ON participant_word_second_aggregates(second_timestamp);

CREATE INDEX idx_word_aggregates_participant_word 
  ON participant_word_aggregates(participant_id, stimulus_word);
CREATE INDEX idx_word_aggregates_participant 
  ON participant_word_aggregates(participant_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_word_second_aggregates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_word_aggregates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_participant_word_second_aggregates_updated_at
  BEFORE UPDATE ON participant_word_second_aggregates
  FOR EACH ROW
  EXECUTE FUNCTION update_word_second_aggregates_updated_at();

CREATE TRIGGER update_participant_word_aggregates_updated_at
  BEFORE UPDATE ON participant_word_aggregates
  FOR EACH ROW
  EXECUTE FUNCTION update_word_aggregates_updated_at();

-- Comments for documentation
COMMENT ON TABLE participant_word_second_aggregates IS '1-second aggregates per word for each participant';
COMMENT ON TABLE participant_word_aggregates IS 'Final aggregated statistics per word for each participant';
COMMENT ON COLUMN participant_word_second_aggregates.reaction_time_stats IS 'JSONB object with avg, std_dev, max, min, count';
COMMENT ON COLUMN participant_word_second_aggregates.emotion_stats IS 'JSONB object with emotion name keys, each containing avg, std_dev, max, min, count';
COMMENT ON COLUMN participant_word_second_aggregates.physiological_stats IS 'JSONB object with avg, std_dev, max, min, count';
COMMENT ON COLUMN participant_word_aggregates.reaction_time_stats IS 'JSONB object with avg, std_dev, max, min, count, median';
COMMENT ON COLUMN participant_timeline_cache.sampled_timeline_data IS 'Pre-sampled timeline data (2000 points) for fast display';
COMMENT ON COLUMN participant_timeline_cache.force_graph_data IS 'Pre-computed 3D Force graph data (100 nodes, max 4950 links)';
COMMENT ON COLUMN participant_timeline_cache.force_graph_metadata IS 'Metadata for the force graph (node count, link count, etc.)';

