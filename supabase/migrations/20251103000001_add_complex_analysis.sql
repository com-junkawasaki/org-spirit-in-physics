-- Merkle DAG: analysis_results_schema -> complex_analysis_schema
-- Complex Analysis テーブル定義: complex = spirit として扱う

-- Complexテーブル: spirit_probabilityと紐付く複合体データ
CREATE TABLE IF NOT EXISTS participant_complexes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  session_id TEXT,
  analysis_result_id UUID REFERENCES participant_analysis_results(id) ON DELETE SET NULL,
  complex_value DECIMAL(5,4) NOT NULL, -- complex = spirit_probability
  word_pairs JSONB DEFAULT '[]'::jsonb, -- 関連する単語ペアの距離データ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ghost Patternテーブル: gene/meme/archetype分類
CREATE TABLE IF NOT EXISTS ghost_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('gene', 'meme', 'archetype')),
  pattern_name TEXT NOT NULL, -- 'Mother', 'Shadow', 'Anima' etc.
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  complex_id UUID REFERENCES participant_complexes(id) ON DELETE CASCADE,
  confidence DECIMAL(5,4) DEFAULT 0.0,
  word_associations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 単語間距離テーブル: 被験者・セッションごとの距離計算結果
CREATE TABLE IF NOT EXISTS word_distances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  session_id TEXT,
  word1 TEXT NOT NULL,
  word2 TEXT NOT NULL,
  distance_type TEXT NOT NULL CHECK (distance_type IN ('word2vec', 'integrated', 'emotional')),
  distance_value DECIMAL(10,6) NOT NULL,
  word1_vector JSONB,
  word2_vector JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant_id, session_id, word1, word2, distance_type)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_complexes_participant ON participant_complexes(participant_id);
CREATE INDEX IF NOT EXISTS idx_complexes_session ON participant_complexes(session_id);
CREATE INDEX IF NOT EXISTS idx_complexes_analysis_result ON participant_complexes(analysis_result_id);
CREATE INDEX IF NOT EXISTS idx_complexes_complex_value ON participant_complexes(complex_value DESC);

CREATE INDEX IF NOT EXISTS idx_ghost_patterns_type ON ghost_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_ghost_patterns_participant ON ghost_patterns(participant_id);
CREATE INDEX IF NOT EXISTS idx_ghost_patterns_complex ON ghost_patterns(complex_id);
CREATE INDEX IF NOT EXISTS idx_ghost_patterns_confidence ON ghost_patterns(confidence DESC);

CREATE INDEX IF NOT EXISTS idx_word_distances_participant_session ON word_distances(participant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_word_distances_words ON word_distances(word1, word2);
CREATE INDEX IF NOT EXISTS idx_word_distances_type ON word_distances(distance_type);
CREATE INDEX IF NOT EXISTS idx_word_distances_value ON word_distances(distance_value);

-- updated_at トリガー関数（既存の場合も考慮）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at トリガー作成
DROP TRIGGER IF EXISTS update_participant_complexes_updated_at ON participant_complexes;
CREATE TRIGGER update_participant_complexes_updated_at
  BEFORE UPDATE ON participant_complexes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ghost_patterns_updated_at ON ghost_patterns;
CREATE TRIGGER update_ghost_patterns_updated_at
  BEFORE UPDATE ON ghost_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLSポリシー設定
ALTER TABLE participant_complexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_distances ENABLE ROW LEVEL SECURITY;

-- participant_complexes RLSポリシー
DROP POLICY IF EXISTS "Users can view participant complexes" ON participant_complexes;
CREATE POLICY "Users can view participant complexes" ON participant_complexes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert participant complexes" ON participant_complexes;
CREATE POLICY "Authenticated users can insert participant complexes" ON participant_complexes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update participant complexes" ON participant_complexes;
CREATE POLICY "Authenticated users can update participant complexes" ON participant_complexes
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete participant complexes" ON participant_complexes;
CREATE POLICY "Authenticated users can delete participant complexes" ON participant_complexes
  FOR DELETE USING (true);

-- ghost_patterns RLSポリシー
DROP POLICY IF EXISTS "Users can view ghost patterns" ON ghost_patterns;
CREATE POLICY "Users can view ghost patterns" ON ghost_patterns
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert ghost patterns" ON ghost_patterns;
CREATE POLICY "Authenticated users can insert ghost patterns" ON ghost_patterns
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update ghost patterns" ON ghost_patterns;
CREATE POLICY "Authenticated users can update ghost_patterns" ON ghost_patterns
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete ghost patterns" ON ghost_patterns;
CREATE POLICY "Authenticated users can delete ghost patterns" ON ghost_patterns
  FOR DELETE USING (true);

-- word_distances RLSポリシー
DROP POLICY IF EXISTS "Users can view word distances" ON word_distances;
CREATE POLICY "Users can view word distances" ON word_distances
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert word distances" ON word_distances;
CREATE POLICY "Authenticated users can insert word distances" ON word_distances
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update word distances" ON word_distances;
CREATE POLICY "Authenticated users can update word distances" ON word_distances
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete word distances" ON word_distances;
CREATE POLICY "Authenticated users can delete word distances" ON word_distances
  FOR DELETE USING (true);

-- コメント追加
COMMENT ON TABLE participant_complexes IS 'ユング心理学の複合体（Complex）データ。complex = spiritとして扱う';
COMMENT ON TABLE ghost_patterns IS '遺伝的・文化的・元型的パターン（gene/meme/archetype）の分類データ';
COMMENT ON TABLE word_distances IS '被験者・セッションごとの単語間距離計算結果';

