-- Merkle DAG: physiological_normalization -> physiological_tables
-- 生理データのJSONBを正規化テーブルに変換

-- 生理測定タイプのマスターテーブル
CREATE TABLE IF NOT EXISTS physiological_measurement_types (
  id SERIAL PRIMARY KEY,
  measurement_type TEXT NOT NULL UNIQUE, -- 'skin_potential', 'heart_rate', 'blood_pressure', etc.
  unit TEXT, -- 'mV', 'bpm', 'mmHg', etc.
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 生理測定テーブル（timeline_points用）
CREATE TABLE IF NOT EXISTS physiological_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_point_time TIMESTAMPTZ NOT NULL,
  timeline_point_participant_id UUID NOT NULL,
  timeline_point_session_id UUID NOT NULL,
  measurement_type_id INTEGER NOT NULL REFERENCES physiological_measurement_types(id) ON DELETE CASCADE,
  value DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (timeline_point_time, timeline_point_participant_id, timeline_point_session_id) 
    REFERENCES timeline_points(time, participant_id, session_id) ON DELETE CASCADE,
  UNIQUE(timeline_point_time, timeline_point_participant_id, timeline_point_session_id, measurement_type_id)
);

-- Prosody特徴のマスターテーブル
CREATE TABLE IF NOT EXISTS prosody_feature_types (
  id SERIAL PRIMARY KEY,
  feature_name TEXT NOT NULL UNIQUE, -- 'pitch', 'intensity', 'speech_rate', etc.
  unit TEXT, -- 'Hz', 'dB', 'syllables/sec', etc.
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prosody特徴テーブル（participant_hume_prosody_predictions用、将来用）
CREATE TABLE IF NOT EXISTS prosody_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prosody_prediction_id UUID, -- 将来participant_hume_prosody_predictionsを参照
  feature_type_id INTEGER NOT NULL REFERENCES prosody_feature_types(id) ON DELETE CASCADE,
  value DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(prosody_prediction_id, feature_type_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_physiological_measurements_timeline ON physiological_measurements(timeline_point_time, timeline_point_participant_id, timeline_point_session_id);
CREATE INDEX IF NOT EXISTS idx_physiological_measurements_type ON physiological_measurements(measurement_type_id);
CREATE INDEX IF NOT EXISTS idx_prosody_features_prediction ON prosody_features(prosody_prediction_id);
CREATE INDEX IF NOT EXISTS idx_prosody_features_type ON prosody_features(feature_type_id);

-- 初期データ投入（timeline_points.physiologicalから - カラムが存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timeline_points' AND column_name = 'physiological'
  ) THEN
    INSERT INTO physiological_measurement_types (measurement_type, unit) 
    SELECT DISTINCT 
      jsonb_object_keys(physiological)::TEXT as measurement_type,
      NULL as unit
    FROM timeline_points 
    WHERE physiological != '{}'::jsonb
    ON CONFLICT (measurement_type) DO NOTHING;
  END IF;
END $$;

