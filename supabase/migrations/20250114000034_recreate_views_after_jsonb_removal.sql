-- Merkle DAG: recreate_views_after_jsonb_removal -> complete_normalization_final
-- JSONBカラム削除後にビューとマテリアライズドビューを再作成

-- 1. timeline_word_aggregates_by_session マテリアライズドビュー
CREATE MATERIALIZED VIEW IF NOT EXISTS timeline_word_aggregates_by_session AS
SELECT
    tp.session_id,
    tp.participant_id,
    COUNT(DISTINCT tp.word) as unique_words_count,
    COUNT(tp.id) as total_timeline_points,
    AVG(tp.reaction_value) as avg_reaction_value,
    MIN(tp.time) as session_start_time,
    MAX(tp.time) as session_end_time
FROM timeline_points tp
GROUP BY tp.session_id, tp.participant_id;

-- 2. timeline_emotion_vectors_by_word マテリアライズドビュー
CREATE MATERIALIZED VIEW IF NOT EXISTS timeline_emotion_vectors_by_word AS
SELECT
    tp.word,
    tp.session_id,
    tp.participant_id,
    en.name as emotion_name,
    AVG(tee.score) as avg_emotion_score,
    COUNT(tee.id) as emotion_count,
    tee.file_type
FROM timeline_points tp
JOIN timeline_emotion_entries tee ON tee.timeline_point_time = tp.time
    AND tee.timeline_point_participant_id = tp.participant_id
    AND tee.timeline_point_session_id = tp.session_id
JOIN emotion_names en ON en.id = tee.emotion_name_id
GROUP BY tp.word, tp.session_id, tp.participant_id, en.name, tee.file_type;

-- 3. timeline_word_statistics_by_session マテリアライズドビュー
CREATE MATERIALIZED VIEW IF NOT EXISTS timeline_word_statistics_by_session AS
SELECT
    tp.session_id,
    tp.participant_id,
    tp.word,
    COUNT(tp.id) as occurrences,
    AVG(tp.reaction_value) as avg_reaction_value,
    MIN(tp.reaction_time) as min_reaction_time,
    MAX(tp.reaction_time) as max_reaction_time,
    AVG(tp.reaction_time) as avg_reaction_time
FROM timeline_points tp
WHERE tp.has_response = true
GROUP BY tp.session_id, tp.participant_id, tp.word;

-- 4. session_detail ビュー
CREATE OR REPLACE VIEW session_detail AS
SELECT
    s.id as session_id,
    s.participant_id,
    s.session_index,
    s.start_ts,
    s.end_ts,
    s.created_at,
    s.updated_at,
    COUNT(DISTINCT tp.word) as unique_words,
    COUNT(tp.id) as total_points,
    COUNT(DISTINCT tee.id) as emotion_entries,
    COUNT(DISTINCT pm.id) as physiological_measurements,
    AVG(tp.reaction_value) as avg_reaction_value
FROM sessions s
LEFT JOIN timeline_points tp ON tp.session_id = s.id
LEFT JOIN timeline_emotion_entries tee ON tee.timeline_point_session_id = s.id
LEFT JOIN physiological_measurements pm ON pm.timeline_point_session_id = s.id
GROUP BY s.id, s.participant_id, s.session_index, s.start_ts, s.end_ts, s.created_at, s.updated_at;

-- 5. participant_detail ビュー
CREATE OR REPLACE VIEW participant_detail AS
SELECT
    p.id as participant_id,
    p.email,
    p.created_at,
    p.updated_at,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(tp.id) as total_timeline_points,
    COUNT(DISTINCT tee.id) as total_emotion_entries,
    COUNT(DISTINCT pm.id) as total_physiological_measurements,
    AVG(tp.reaction_value) as avg_reaction_value,
    MIN(s.start_ts) as first_session_date,
    MAX(s.end_ts) as last_session_date
FROM participants p
LEFT JOIN sessions s ON s.participant_id = p.id
LEFT JOIN timeline_points tp ON tp.participant_id = p.id
LEFT JOIN timeline_emotion_entries tee ON tee.timeline_point_participant_id = p.id
LEFT JOIN physiological_measurements pm ON pm.timeline_point_participant_id = p.id
GROUP BY p.id, p.email, p.created_at, p.updated_at;

-- 6. participant_summary ビュー
CREATE OR REPLACE VIEW participant_summary AS
SELECT
    p.id as participant_id,
    p.email,
    COUNT(DISTINCT s.id) as sessions_count,
    COUNT(tp.id) as timeline_points_count,
    COUNT(DISTINCT tee.id) as emotion_entries_count,
    COUNT(DISTINCT pm.id) as physiological_entries_count,
    AVG(tp.reaction_value) as avg_reaction_value,
    MAX(s.updated_at) as last_activity
FROM participants p
LEFT JOIN sessions s ON s.participant_id = p.id
LEFT JOIN timeline_points tp ON tp.participant_id = p.id
LEFT JOIN timeline_emotion_entries tee ON tee.timeline_point_participant_id = p.id
LEFT JOIN physiological_measurements pm ON pm.timeline_point_participant_id = p.id
GROUP BY p.id, p.email;

-- 7. インデックス作成
CREATE INDEX IF NOT EXISTS idx_timeline_word_aggregates_session_participant
    ON timeline_word_aggregates_by_session(session_id, participant_id);

CREATE INDEX IF NOT EXISTS idx_timeline_emotion_vectors_word_session
    ON timeline_emotion_vectors_by_word(word, session_id);

CREATE INDEX IF NOT EXISTS idx_timeline_word_statistics_session_word
    ON timeline_word_statistics_by_session(session_id, word);

-- 8. コメント追加
COMMENT ON MATERIALIZED VIEW timeline_word_aggregates_by_session IS 'Aggregated word statistics per session (normalized)';
COMMENT ON MATERIALIZED VIEW timeline_emotion_vectors_by_word IS 'Emotion vectors per word per session (normalized)';
COMMENT ON MATERIALIZED VIEW timeline_word_statistics_by_session IS 'Detailed word reaction statistics per session (normalized)';
COMMENT ON VIEW session_detail IS 'Detailed session information with normalized data counts';
COMMENT ON VIEW participant_detail IS 'Detailed participant information with normalized data counts';
COMMENT ON VIEW participant_summary IS 'Summary participant information with normalized data counts';
