-- Merkle DAG: recreate_views_with_enums -> views_using_direct_enums
-- ENUM型を直接使用するようにビューとマテリアライズドビューを再作成

-- 1. timeline_word_aggregates_by_session マテリアライズドビュー
CREATE MATERIALIZED VIEW IF NOT EXISTS timeline_word_aggregates_by_session AS
SELECT 
    tp.participant_id,
    tp.session_id,
    tp.word,
    COUNT(DISTINCT tp.time) as word_count,
    AVG(tp.reaction_value) as avg_reaction_value,
    AVG(tp.reaction_time) as avg_reaction_time,
    COUNT(DISTINCT CASE WHEN tp.has_response THEN tp.time END) as response_count
FROM timeline_points tp
WHERE tp.word IS NOT NULL
GROUP BY tp.participant_id, tp.session_id, tp.word;

CREATE INDEX IF NOT EXISTS idx_timeline_word_aggregates_by_session_participant_session 
    ON timeline_word_aggregates_by_session(participant_id, session_id);

-- 2. timeline_emotion_vectors_by_word マテリアライズドビュー
CREATE MATERIALIZED VIEW IF NOT EXISTS timeline_emotion_vectors_by_word AS
SELECT 
    tp.participant_id,
    tp.session_id,
    tp.word,
    -- 感情スコアの合計（主要感情のみ）
    SUM(CASE WHEN tee.emotion_name = 'Joy' THEN tee.score ELSE 0 END) as joy_sum,
    SUM(CASE WHEN tee.emotion_name = 'Sadness' THEN tee.score ELSE 0 END) as sadness_sum,
    SUM(CASE WHEN tee.emotion_name = 'Anger' THEN tee.score ELSE 0 END) as anger_sum,
    SUM(CASE WHEN tee.emotion_name = 'Fear' THEN tee.score ELSE 0 END) as fear_sum,
    SUM(CASE WHEN tee.emotion_name = 'Surprise' OR tee.emotion_name = 'Surprise (positive)' OR tee.emotion_name = 'Surprise (negative)' THEN tee.score ELSE 0 END) as surprise_sum,
    SUM(CASE WHEN tee.emotion_name = 'Disgust' THEN tee.score ELSE 0 END) as disgust_sum,
    SUM(CASE WHEN tee.emotion_name = 'Calmness' THEN tee.score ELSE 0 END) as calm_sum,
    SUM(CASE WHEN tee.emotion_name = 'Concentration' THEN tee.score ELSE 0 END) as focus_sum,
    SUM(CASE WHEN tee.emotion_name = 'Excitement' THEN tee.score ELSE 0 END) as excitement_sum,
    SUM(CASE WHEN tee.emotion_name = 'Confusion' THEN tee.score ELSE 0 END) as confusion_sum,
    COUNT(DISTINCT tee.id) as emotion_entry_count,
    -- モダリティ別の感情データ（JSONBとして集約）
    jsonb_object_agg(
        DISTINCT tee.file_type::text,
        jsonb_build_object(
            'emotion', tee.emotion_name::text,
            'score', tee.score
        )
    ) FILTER (WHERE tee.id IS NOT NULL) as emotion_by_modality
FROM timeline_points tp
LEFT JOIN timeline_emotion_entries tee ON 
    tee.timeline_point_time = tp.time AND
    tee.timeline_point_participant_id = tp.participant_id AND
    tee.timeline_point_session_id = tp.session_id
WHERE tp.word IS NOT NULL
GROUP BY tp.participant_id, tp.session_id, tp.word;

CREATE INDEX IF NOT EXISTS idx_timeline_emotion_vectors_by_word_participant_session 
    ON timeline_emotion_vectors_by_word(participant_id, session_id);

-- 3. timeline_word_statistics_by_session マテリアライズドビュー
CREATE MATERIALIZED VIEW IF NOT EXISTS timeline_word_statistics_by_session AS
SELECT 
    tp.participant_id,
    tp.session_id,
    COUNT(DISTINCT tp.time) as total_points,
    COUNT(DISTINCT tp.word) as unique_words,
    AVG(tp.reaction_value) as avg_reaction_value,
    STDDEV(tp.reaction_value) as std_reaction_value,
    AVG(tp.reaction_time) as avg_reaction_time,
    STDDEV(tp.reaction_time) as std_reaction_time,
    COUNT(DISTINCT CASE WHEN tp.has_response THEN tp.time END) as response_count,
    -- 感情データの統計
    COUNT(DISTINCT tee.id) as emotion_entry_count,
    AVG(tee.score) as avg_emotion_score,
    STDDEV(tee.score) as std_emotion_score,
    -- 生理的測定データの統計
    COUNT(DISTINCT pm.id) as physiological_measurement_count,
    AVG(pm.value) as avg_physiological,
    STDDEV(pm.value) as std_physiological,
    VARIANCE(pm.value) as var_physiological,
    -- 時系列データ
    ARRAY_AGG(
        DISTINCT jsonb_build_object(
            'time', tp.time::text,
            'reaction_value', tp.reaction_value,
            'reaction_time', tp.reaction_time
        )
        ORDER BY tp.time
    ) FILTER (WHERE tp.time IS NOT NULL) as reaction_series,
    ARRAY_AGG(
        DISTINCT jsonb_build_object(
            'time', tp.time::text,
            'physiological_value', pm.value,
            'measurement_type', pm.measurement_type::text
        )
        ORDER BY tp.time
    ) FILTER (WHERE pm.id IS NOT NULL) as phys_series
FROM timeline_points tp
LEFT JOIN timeline_emotion_entries tee ON 
    tee.timeline_point_time = tp.time AND
    tee.timeline_point_participant_id = tp.participant_id AND
    tee.timeline_point_session_id = tp.session_id
LEFT JOIN physiological_measurements pm ON
    pm.timeline_point_time = tp.time AND
    pm.timeline_point_participant_id = tp.participant_id AND
    pm.timeline_point_session_id = tp.session_id
GROUP BY tp.participant_id, tp.session_id;

CREATE INDEX IF NOT EXISTS idx_timeline_word_statistics_by_session_participant_session 
    ON timeline_word_statistics_by_session(participant_id, session_id);

-- 4. participant_summary ビュー
CREATE OR REPLACE VIEW participant_summary AS
SELECT 
    p.id,
    p.age,
    p.gender,
    p.handedness,
    COUNT(DISTINCT s.id) as session_count,
    COUNT(DISTINCT tp.time) as total_timeline_points,
    COUNT(DISTINCT tp.word) as unique_words,
    AVG(tp.reaction_value) as avg_reaction_value,
    AVG(tp.reaction_time) as avg_reaction_time,
    COUNT(DISTINCT CASE WHEN tp.has_response THEN tp.time END) as total_responses,
    COUNT(DISTINCT tee.id) as total_emotion_entries,
    COUNT(DISTINCT pm.id) as total_physiological_measurements
FROM participants p
LEFT JOIN sessions s ON s.participant_id = p.id
LEFT JOIN timeline_points tp ON tp.participant_id = p.id AND tp.session_id = s.id
LEFT JOIN timeline_emotion_entries tee ON 
    tee.timeline_point_participant_id = p.id AND
    tee.timeline_point_session_id = s.id
LEFT JOIN physiological_measurements pm ON
    pm.timeline_point_participant_id = p.id AND
    pm.timeline_point_session_id = s.id
GROUP BY p.id, p.age, p.gender, p.handedness;

-- 5. session_detail ビュー
CREATE OR REPLACE VIEW session_detail AS
SELECT 
    s.id,
    s.participant_id,
    s.session_index,
    s.start_ts,
    s.end_ts,
    COUNT(DISTINCT tp.time) as timeline_point_count,
    COUNT(DISTINCT tp.word) as unique_words,
    AVG(tp.reaction_value) as avg_reaction_value,
    AVG(tp.reaction_time) as avg_reaction_time,
    COUNT(DISTINCT CASE WHEN tp.has_response THEN tp.time END) as response_count,
    COUNT(DISTINCT se.id) as event_count,
    COUNT(DISTINCT tee.id) as emotion_entry_count,
    COUNT(DISTINCT pm.id) as physiological_measurement_count
FROM sessions s
LEFT JOIN timeline_points tp ON tp.session_id = s.id
LEFT JOIN session_events se ON se.session_id = s.id
LEFT JOIN timeline_emotion_entries tee ON 
    tee.timeline_point_session_id = s.id
LEFT JOIN physiological_measurements pm ON
    pm.timeline_point_session_id = s.id
GROUP BY s.id, s.participant_id, s.session_index, s.start_ts, s.end_ts;

-- 6. participant_detail ビュー
CREATE OR REPLACE VIEW participant_detail AS
SELECT 
    p.id,
    p.age,
    p.gender,
    p.handedness,
    p.created_at,
    p.updated_at,
    COUNT(DISTINCT s.id) as session_count,
    COUNT(DISTINCT tp.time) as total_timeline_points,
    COUNT(DISTINCT tp.word) as unique_words,
    AVG(tp.reaction_value) as avg_reaction_value,
    STDDEV(tp.reaction_value) as std_reaction_value,
    AVG(tp.reaction_time) as avg_reaction_time,
    STDDEV(tp.reaction_time) as std_reaction_time,
    COUNT(DISTINCT CASE WHEN tp.has_response THEN tp.time END) as total_responses,
    COUNT(DISTINCT tee.id) as total_emotion_entries,
    AVG(tee.score) as avg_emotion_score,
    COUNT(DISTINCT pm.id) as total_physiological_measurements,
    AVG(pm.value) as avg_physiological_value
FROM participants p
LEFT JOIN sessions s ON s.participant_id = p.id
LEFT JOIN timeline_points tp ON tp.participant_id = p.id AND tp.session_id = s.id
LEFT JOIN timeline_emotion_entries tee ON 
    tee.timeline_point_participant_id = p.id AND
    tee.timeline_point_session_id = s.id
LEFT JOIN physiological_measurements pm ON
    pm.timeline_point_participant_id = p.id AND
    pm.timeline_point_session_id = s.id
GROUP BY p.id, p.age, p.gender, p.handedness, p.created_at, p.updated_at;

-- 7. マテリアライズドビューをリフレッシュする関数
CREATE OR REPLACE FUNCTION refresh_timeline_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY timeline_word_aggregates_by_session;
    REFRESH MATERIALIZED VIEW CONCURRENTLY timeline_emotion_vectors_by_word;
    REFRESH MATERIALIZED VIEW CONCURRENTLY timeline_word_statistics_by_session;
END;
$$ LANGUAGE plpgsql;

-- 8. コメント追加
COMMENT ON MATERIALIZED VIEW timeline_word_aggregates_by_session IS 'Aggregated word statistics by session. Uses direct ENUM types (no JOINs to master tables).';
COMMENT ON MATERIALIZED VIEW timeline_emotion_vectors_by_word IS 'Emotion vectors aggregated by word. Uses direct ENUM types (no JOINs to master tables).';
COMMENT ON MATERIALIZED VIEW timeline_word_statistics_by_session IS 'Word statistics by session. Uses direct ENUM types (no JOINs to master tables).';
COMMENT ON VIEW participant_summary IS 'Participant summary view. Uses direct ENUM types (no JOINs to master tables).';
COMMENT ON VIEW session_detail IS 'Session detail view. Uses direct ENUM types (no JOINs to master tables).';
COMMENT ON VIEW participant_detail IS 'Participant detail view. Uses direct ENUM types (no JOINs to master tables).';

