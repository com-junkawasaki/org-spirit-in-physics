-- Merkle DAG: timeseries_indexes -> performance_optimization
-- 時系列クエリ用の追加インデックス作成

-- Timeline points の複合インデックス（よく使われるクエリパターン用）
CREATE INDEX IF NOT EXISTS idx_timeline_points_participant_session_time 
ON timeline_points (participant_id, session_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_points_word_time 
ON timeline_points (word, time DESC) 
WHERE word IS NOT NULL;

-- GINインデックス（JSONBカラムの検索用）
CREATE INDEX IF NOT EXISTS idx_timeline_points_emotions_gin 
ON timeline_points USING GIN (emotions);

CREATE INDEX IF NOT EXISTS idx_timeline_points_physiological_gin 
ON timeline_points USING GIN (physiological);

-- 感情データテーブルの複合インデックス
CREATE INDEX IF NOT EXISTS idx_burst_emotion_participant_session_time 
ON burst_emotion_data (participant_id, session_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_face_emotion_participant_session_time 
ON face_emotion_data (participant_id, session_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_language_emotion_participant_session_time 
ON language_emotion_data (participant_id, session_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_prosody_emotion_participant_session_time 
ON prosody_emotion_data (participant_id, session_id, time DESC);

-- JSONBインデックス（感情スコアの検索用）
CREATE INDEX IF NOT EXISTS idx_burst_emotion_scores_gin 
ON burst_emotion_data USING GIN (emotion_scores);

CREATE INDEX IF NOT EXISTS idx_face_emotion_scores_gin 
ON face_emotion_data USING GIN (emotion_scores);

CREATE INDEX IF NOT EXISTS idx_language_emotion_scores_gin 
ON language_emotion_data USING GIN (emotion_scores);

CREATE INDEX IF NOT EXISTS idx_prosody_emotion_scores_gin 
ON prosody_emotion_data USING GIN (emotion_scores);

