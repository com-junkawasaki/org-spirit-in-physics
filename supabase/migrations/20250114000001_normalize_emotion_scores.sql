-- Merkle DAG: emotion_normalization -> emotion_scores_tables
-- 感情スコアのJSONBを正規化テーブルに変換

-- 感情名のマスターテーブル
CREATE TABLE IF NOT EXISTS emotion_names (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT, -- 'vocal', 'facial', 'language', 'prosody', 'general'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 感情スコアテーブル（burst_emotion_data用）
CREATE TABLE IF NOT EXISTS burst_emotion_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  burst_emotion_data_id UUID NOT NULL REFERENCES burst_emotion_data(id) ON DELETE CASCADE,
  emotion_name_id INTEGER NOT NULL REFERENCES emotion_names(id) ON DELETE CASCADE,
  score DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(burst_emotion_data_id, emotion_name_id)
);

-- 感情スコアテーブル（face_emotion_data用）
CREATE TABLE IF NOT EXISTS face_emotion_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  face_emotion_data_id UUID NOT NULL REFERENCES face_emotion_data(id) ON DELETE CASCADE,
  emotion_name_id INTEGER NOT NULL REFERENCES emotion_names(id) ON DELETE CASCADE,
  score DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(face_emotion_data_id, emotion_name_id)
);

-- 感情スコアテーブル（language_emotion_data用）
CREATE TABLE IF NOT EXISTS language_emotion_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_emotion_data_id UUID NOT NULL REFERENCES language_emotion_data(id) ON DELETE CASCADE,
  emotion_name_id INTEGER NOT NULL REFERENCES emotion_names(id) ON DELETE CASCADE,
  score DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(language_emotion_data_id, emotion_name_id)
);

-- 感情スコアテーブル（prosody_emotion_data用）
CREATE TABLE IF NOT EXISTS prosody_emotion_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosody_emotion_data_id UUID NOT NULL REFERENCES prosody_emotion_data(id) ON DELETE CASCADE,
  emotion_name_id INTEGER NOT NULL REFERENCES emotion_names(id) ON DELETE CASCADE,
  score DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(prosody_emotion_data_id, emotion_name_id)
);

-- 毒性スコアテーブル（language_emotion_data用）
CREATE TABLE IF NOT EXISTS toxicity_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_emotion_data_id UUID NOT NULL REFERENCES language_emotion_data(id) ON DELETE CASCADE,
  toxicity_type TEXT NOT NULL, -- 'toxicity', 'severe_toxicity', 'obscene', 'threat', 'insult', 'identity_attack'
  score DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(language_emotion_data_id, toxicity_type)
);

-- Action Unitスコアテーブル（face_emotion_data用）
CREATE TABLE IF NOT EXISTS action_unit_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  face_emotion_data_id UUID NOT NULL REFERENCES face_emotion_data(id) ON DELETE CASCADE,
  au_number INTEGER NOT NULL, -- Action Unit番号（1-28など）
  score DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(face_emotion_data_id, au_number)
);

-- timeline_points用の感情エントリーテーブル
CREATE TABLE IF NOT EXISTS timeline_emotion_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_point_time TIMESTAMPTZ NOT NULL,
  timeline_point_participant_id UUID NOT NULL,
  timeline_point_session_id UUID NOT NULL,
  emotion_name_id INTEGER NOT NULL REFERENCES emotion_names(id) ON DELETE CASCADE,
  score DOUBLE PRECISION NOT NULL,
  file_type TEXT, -- 'burst', 'face', 'language', 'prosody'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (timeline_point_time, timeline_point_participant_id, timeline_point_session_id) 
    REFERENCES timeline_points(time, participant_id, session_id) ON DELETE CASCADE,
  UNIQUE(timeline_point_time, timeline_point_participant_id, timeline_point_session_id, emotion_name_id, file_type)
);

-- 発声タイプテーブル（burst_emotion_data用）
CREATE TABLE IF NOT EXISTS vocal_type_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  burst_emotion_data_id UUID NOT NULL REFERENCES burst_emotion_data(id) ON DELETE CASCADE,
  vocal_type TEXT NOT NULL, -- 'Ah', 'Ha', 'Oh', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(burst_emotion_data_id, vocal_type)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_burst_emotion_scores_burst_id ON burst_emotion_scores(burst_emotion_data_id);
CREATE INDEX IF NOT EXISTS idx_burst_emotion_scores_emotion_name ON burst_emotion_scores(emotion_name_id);
CREATE INDEX IF NOT EXISTS idx_face_emotion_scores_face_id ON face_emotion_scores(face_emotion_data_id);
CREATE INDEX IF NOT EXISTS idx_face_emotion_scores_emotion_name ON face_emotion_scores(emotion_name_id);
CREATE INDEX IF NOT EXISTS idx_language_emotion_scores_language_id ON language_emotion_scores(language_emotion_data_id);
CREATE INDEX IF NOT EXISTS idx_language_emotion_scores_emotion_name ON language_emotion_scores(emotion_name_id);
CREATE INDEX IF NOT EXISTS idx_prosody_emotion_scores_prosody_id ON prosody_emotion_scores(prosody_emotion_data_id);
CREATE INDEX IF NOT EXISTS idx_prosody_emotion_scores_emotion_name ON prosody_emotion_scores(emotion_name_id);
CREATE INDEX IF NOT EXISTS idx_toxicity_scores_language_id ON toxicity_scores(language_emotion_data_id);
CREATE INDEX IF NOT EXISTS idx_action_unit_scores_face_id ON action_unit_scores(face_emotion_data_id);
CREATE INDEX IF NOT EXISTS idx_timeline_emotion_entries_timeline ON timeline_emotion_entries(timeline_point_time, timeline_point_participant_id, timeline_point_session_id);
CREATE INDEX IF NOT EXISTS idx_timeline_emotion_entries_emotion_name ON timeline_emotion_entries(emotion_name_id);
CREATE INDEX IF NOT EXISTS idx_vocal_type_entries_burst_id ON vocal_type_entries(burst_emotion_data_id);

-- 感情名の初期データ投入（既存データから抽出 - emotion_scoresカラムが存在する場合のみ）
DO $$
BEGIN
  -- burst_emotion_dataから抽出
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'burst_emotion_data' AND column_name = 'emotion_scores'
  ) THEN
    INSERT INTO emotion_names (name, category) 
    SELECT DISTINCT 
      jsonb_object_keys(emotion_scores)::TEXT as name,
      'vocal' as category
    FROM burst_emotion_data 
    WHERE emotion_scores != '{}'::jsonb
    ON CONFLICT (name) DO NOTHING;
  END IF;

  -- face_emotion_dataから抽出
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'face_emotion_data' AND column_name = 'emotion_scores'
  ) THEN
    INSERT INTO emotion_names (name, category) 
    SELECT DISTINCT 
      jsonb_object_keys(emotion_scores)::TEXT as name,
      'facial' as category
    FROM face_emotion_data 
    WHERE emotion_scores != '{}'::jsonb
    ON CONFLICT (name) DO NOTHING;
  END IF;

  -- language_emotion_dataから抽出
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'language_emotion_data' AND column_name = 'emotion_scores'
  ) THEN
    INSERT INTO emotion_names (name, category) 
    SELECT DISTINCT 
      jsonb_object_keys(emotion_scores)::TEXT as name,
      'language' as category
    FROM language_emotion_data 
    WHERE emotion_scores != '{}'::jsonb
    ON CONFLICT (name) DO NOTHING;
  END IF;

  -- prosody_emotion_dataから抽出
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prosody_emotion_data' AND column_name = 'emotion_scores'
  ) THEN
    INSERT INTO emotion_names (name, category) 
    SELECT DISTINCT 
      jsonb_object_keys(emotion_scores)::TEXT as name,
      'prosody' as category
    FROM prosody_emotion_data 
    WHERE emotion_scores != '{}'::jsonb
    ON CONFLICT (name) DO NOTHING;
  END IF;
END $$;

-- timeline_pointsから感情名を抽出（emotionsカラムが存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timeline_points' AND column_name = 'emotions'
  ) THEN
    INSERT INTO emotion_names (name, category) 
    SELECT DISTINCT 
      (emotion->>'name')::TEXT as name,
      COALESCE((emotion->>'fileType')::TEXT, 'general') as category
    FROM timeline_points,
      LATERAL jsonb_array_elements(emotions) as emotion
    WHERE emotions != '[]'::jsonb
    ON CONFLICT (name) DO NOTHING;
  END IF;
END $$;

