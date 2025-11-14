-- Merkle DAG: recreate_views_after_session_event_enum -> restore_views
-- session_event_type_enumへの移行後にビューとマテリアライズドビューを再作成

-- 1. timeline_word_aggregates_by_session マテリアライズドビューの再作成
CREATE MATERIALIZED VIEW IF NOT EXISTS timeline_word_aggregates_by_session AS
SELECT 
    tp.participant_id,
    tp.session_id,
    tp.word,
    COUNT(*) as count,
    AVG(tp.reaction_value) as avg_reaction_value,
    SUM(tp.reaction_value) as sum_reaction_value,
    AVG(tp.reaction_time) as avg_reaction_time,
    SUM(tp.reaction_time) as sum_reaction_time,
    AVG(
        (SELECT AVG(pm.value)
         FROM physiological_measurements pm
         JOIN physiological_measurement_types pmt ON pmt.id = pm.measurement_type_id
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
    ) as avg_physiological,
    SUM(
        (SELECT ABS(AVG(pm.value))
         FROM physiological_measurements pm
         JOIN physiological_measurement_types pmt ON pmt.id = pm.measurement_type_id
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
    ) as sum_phys_abs,
    ARRAY_AGG(
        (SELECT AVG(pm.value)
         FROM physiological_measurements pm
         JOIN physiological_measurement_types pmt ON pmt.id = pm.measurement_type_id
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
        ORDER BY tp.time
    ) FILTER (WHERE tp.time IS NOT NULL) as phys_series,
    ARRAY_AGG(tp.reaction_time ORDER BY tp.time) FILTER (WHERE tp.reaction_time IS NOT NULL) as rt_series,
    ARRAY_AGG(tp.reaction_value ORDER BY tp.time) FILTER (WHERE tp.reaction_value IS NOT NULL) as rv_series,
    MIN(tp.time) as first_time,
    MAX(tp.time) as last_time
FROM timeline_points tp
GROUP BY tp.participant_id, tp.session_id, tp.word;

CREATE INDEX IF NOT EXISTS idx_timeline_word_aggregates_by_session_participant_session 
    ON timeline_word_aggregates_by_session(participant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_timeline_word_aggregates_by_session_word 
    ON timeline_word_aggregates_by_session(word);

-- 2. timeline_emotion_vectors_by_word マテリアライズドビューの再作成
CREATE MATERIALIZED VIEW IF NOT EXISTS timeline_emotion_vectors_by_word AS
SELECT 
    tp.participant_id,
    tp.session_id,
    tp.word,
    SUM(CASE WHEN en.name = 'joy' THEN tee.score ELSE 0 END) as joy_sum,
    SUM(CASE WHEN en.name = 'sadness' THEN tee.score ELSE 0 END) as sadness_sum,
    SUM(CASE WHEN en.name = 'anger' THEN tee.score ELSE 0 END) as anger_sum,
    SUM(CASE WHEN en.name = 'fear' THEN tee.score ELSE 0 END) as fear_sum,
    SUM(CASE WHEN en.name = 'surprise' THEN tee.score ELSE 0 END) as surprise_sum,
    SUM(CASE WHEN en.name = 'disgust' THEN tee.score ELSE 0 END) as disgust_sum,
    SUM(CASE WHEN en.name = 'calm' THEN tee.score ELSE 0 END) as calm_sum,
    SUM(CASE WHEN en.name = 'focus' THEN tee.score ELSE 0 END) as focus_sum,
    SUM(CASE WHEN en.name = 'excitement' THEN tee.score ELSE 0 END) as excitement_sum,
    SUM(CASE WHEN en.name = 'confusion' THEN tee.score ELSE 0 END) as confusion_sum,
    COUNT(tee.id) as emotion_entry_count,
    COALESCE(
        (SELECT json_object_agg(file_type, emotions_json)
         FROM (
           SELECT 
             tee2.file_type::text as file_type,
             json_agg(
               json_build_object(
                 'name', en2.name,
                 'score', tee2.score
               )
             ) as emotions_json
           FROM timeline_emotion_entries tee2
           JOIN emotion_names en2 ON en2.id = tee2.emotion_name_id
           WHERE tee2.timeline_point_participant_id = tp.participant_id
           AND tee2.timeline_point_session_id = tp.session_id
           AND EXISTS (
             SELECT 1 FROM timeline_points tp2
             WHERE tp2.participant_id = tee2.timeline_point_participant_id
             AND tp2.session_id = tee2.timeline_point_session_id
             AND tp2.time = tee2.timeline_point_time
             AND tp2.word = tp.word
           )
           GROUP BY tee2.file_type
         ) subq),
        '{}'::json
    ) as emotion_by_modality
FROM timeline_points tp
LEFT JOIN timeline_emotion_entries tee ON 
    tee.timeline_point_time = tp.time AND
    tee.timeline_point_participant_id = tp.participant_id AND
    tee.timeline_point_session_id = tp.session_id
LEFT JOIN emotion_names en ON en.id = tee.emotion_name_id
WHERE tp.word IS NOT NULL
GROUP BY tp.participant_id, tp.session_id, tp.word;

CREATE INDEX IF NOT EXISTS idx_timeline_emotion_vectors_by_word_participant_session 
    ON timeline_emotion_vectors_by_word(participant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_timeline_emotion_vectors_by_word_word 
    ON timeline_emotion_vectors_by_word(word);

-- 3. timeline_word_statistics_by_session マテリアライズドビューの再作成
CREATE MATERIALIZED VIEW IF NOT EXISTS timeline_word_statistics_by_session AS
SELECT 
    tp.participant_id,
    tp.session_id,
    tp.word,
    COUNT(*) as count,
    AVG(tp.reaction_time) as avg_reaction_time,
    STDDEV(tp.reaction_time) as std_reaction_time,
    VARIANCE(tp.reaction_time) as var_reaction_time,
    AVG(tp.reaction_value) as avg_reaction_value,
    STDDEV(tp.reaction_value) as std_reaction_value,
    VARIANCE(tp.reaction_value) as var_reaction_value,
    AVG(
        (SELECT AVG(pm.value)
         FROM physiological_measurements pm
         JOIN physiological_measurement_types pmt ON pmt.id = pm.measurement_type_id
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
    ) as avg_physiological,
    STDDEV(
        (SELECT AVG(pm.value)
         FROM physiological_measurements pm
         JOIN physiological_measurement_types pmt ON pmt.id = pm.measurement_type_id
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
    ) as std_physiological,
    VARIANCE(
        (SELECT AVG(pm.value)
         FROM physiological_measurements pm
         JOIN physiological_measurement_types pmt ON pmt.id = pm.measurement_type_id
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
    ) as var_physiological,
    -- Speed index: avg_reaction_time / avg_reaction_value (lower is faster)
    CASE 
        WHEN AVG(tp.reaction_value) > 0 THEN AVG(tp.reaction_time) / AVG(tp.reaction_value)
        ELSE NULL
    END as speed_index,
    ARRAY_AGG(
        (SELECT AVG(pm.value)
         FROM physiological_measurements pm
         JOIN physiological_measurement_types pmt ON pmt.id = pm.measurement_type_id
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
        ORDER BY tp.time
    ) FILTER (WHERE tp.time IS NOT NULL) as phys_series,
    ARRAY_AGG(tp.reaction_time ORDER BY tp.time) FILTER (WHERE tp.reaction_time IS NOT NULL) as rt_series
FROM timeline_points tp
GROUP BY tp.participant_id, tp.session_id, tp.word;

CREATE INDEX IF NOT EXISTS idx_timeline_word_statistics_by_session_participant_session 
    ON timeline_word_statistics_by_session(participant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_timeline_word_statistics_by_session_word 
    ON timeline_word_statistics_by_session(word);

-- 4. participant_summary ビューの再作成
CREATE OR REPLACE VIEW participant_summary AS
SELECT 
    p.id,
    p.age,
    p.gender,
    p.handedness,
    COUNT(DISTINCT s.id) as session_count,
    MIN(s.start_time) as first_session_time,
    MAX(s.end_time) as last_session_time,
    AVG(EXTRACT(EPOCH FROM (s.end_time - s.start_time))) as avg_session_duration_seconds
FROM participants p
LEFT JOIN sessions s ON s.participant_id = p.id
GROUP BY p.id, p.age, p.gender, p.handedness;

-- 5. session_detail ビューの再作成
CREATE OR REPLACE VIEW session_detail AS
SELECT 
    s.id,
    s.participant_id,
    s.session_index,
    s.session_type,
    s.start_time,
    s.end_time,
    COUNT(DISTINCT se.id) as event_count,
    COUNT(DISTINCT (tp.time, tp.participant_id, tp.session_id)) as timeline_point_count,
    COUNT(DISTINCT tee.id) as emotion_entry_count,
    COUNT(DISTINCT pm.id) as physiological_measurement_count
FROM sessions s
LEFT JOIN session_events se ON se.session_id = s.id
LEFT JOIN timeline_points tp ON tp.session_id = s.id AND tp.participant_id = s.participant_id
LEFT JOIN timeline_emotion_entries tee ON 
    tee.timeline_point_session_id = s.id AND
    tee.timeline_point_participant_id = s.participant_id
LEFT JOIN physiological_measurements pm ON 
    pm.timeline_point_session_id = s.id AND
    pm.timeline_point_participant_id = s.participant_id
GROUP BY s.id, s.participant_id, s.session_index, s.session_type, s.start_time, s.end_time;

-- 6. participant_detail ビューの再作成
CREATE OR REPLACE VIEW participant_detail AS
SELECT 
    p.id,
    p.age,
    p.gender,
    p.handedness,
    p.created_at,
    p.updated_at,
    COUNT(DISTINCT s.id) as session_count,
    COUNT(DISTINCT se.id) as total_event_count,
    COUNT(DISTINCT (tp.time, tp.participant_id, tp.session_id)) as total_timeline_point_count,
    COUNT(DISTINCT tee.id) as total_emotion_entry_count,
    COUNT(DISTINCT pm.id) as total_physiological_measurement_count,
    MIN(s.start_time) as first_session_time,
    MAX(s.end_time) as last_session_time
FROM participants p
LEFT JOIN sessions s ON s.participant_id = p.id
LEFT JOIN session_events se ON se.session_id = s.id
LEFT JOIN timeline_points tp ON tp.participant_id = p.id
LEFT JOIN timeline_emotion_entries tee ON tee.timeline_point_participant_id = p.id
LEFT JOIN physiological_measurements pm ON pm.timeline_point_participant_id = p.id
GROUP BY p.id, p.age, p.gender, p.handedness, p.created_at, p.updated_at;

