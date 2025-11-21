-- Merkle DAG: recreate_views_after_type_enums -> restore_dropped_views_after_type_enums
-- event_type_enumとmeasurement_type_enum変換後に削除されたビューとマテリアライズドビューを再作成

-- 1. マテリアライズドビューの再作成
-- timeline_emotion_vectors_by_word
CREATE MATERIALIZED VIEW IF NOT EXISTS timeline_emotion_vectors_by_word AS
SELECT 
  tp.participant_id,
  tp.session_id,
  tp.word,
  SUM(CASE WHEN LOWER(en.name) IN ('joy', 'happiness') THEN tee.score ELSE 0 END) as joy_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('sadness', 'sad') THEN tee.score ELSE 0 END) as sadness_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('anger', 'angry') THEN tee.score ELSE 0 END) as anger_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('fear', 'anxiety') THEN tee.score ELSE 0 END) as fear_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('surprise', 'surprised') THEN tee.score ELSE 0 END) as surprise_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('disgust', 'disgusted') THEN tee.score ELSE 0 END) as disgust_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('calm', 'calmness') THEN tee.score ELSE 0 END) as calm_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('focus', 'concentration') THEN tee.score ELSE 0 END) as focus_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('excitement', 'excited') THEN tee.score ELSE 0 END) as excitement_sum,
  SUM(CASE WHEN LOWER(en.name) IN ('confusion', 'confused') THEN tee.score ELSE 0 END) as confusion_sum,
  COUNT(tee.id)::bigint as emotion_entry_count,
  COALESCE(
    (SELECT json_object_agg(file_type, total_score)
     FROM (
       SELECT 
         tee2.file_type,
         SUM(tee2.score) as total_score
       FROM timeline_emotion_entries tee2
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_emotion_vectors_pk
ON timeline_emotion_vectors_by_word (participant_id, session_id, word);

CREATE INDEX IF NOT EXISTS idx_emotion_vectors_participant_session
ON timeline_emotion_vectors_by_word (participant_id, session_id);

-- 2. ビューの再作成
-- participant_detailビューの再作成
DROP VIEW IF EXISTS participant_detail CASCADE;
CREATE VIEW participant_detail AS
SELECT
  p.id as participant_id,
  p.age,
  p.gender,
  p.handedness,
  p.created_at as participant_created_at,
  (
    SELECT json_agg(
      json_build_object(
        'id', s.id,
        'session_index', s.session_index,
        'session_type', s.session_type,
        'start_time', s.start_time,
        'end_time', s.end_time,
        'response_count', (
          SELECT COUNT(*) FROM timeline_points tp
          WHERE tp.participant_id = p.id AND tp.session_id = s.id AND tp.has_response = TRUE
        )
      ) ORDER BY s.start_time DESC
    )
    FROM sessions s
    WHERE s.participant_id = p.id
  ) as sessions,
  COUNT(DISTINCT s2.id) as total_sessions,
  COUNT(*) FILTER (WHERE tp.has_response = TRUE) as total_responses,
  MAX(tp.reaction_value) as max_reaction_value,
  AVG(tp.reaction_value) as avg_reaction_value,
  MAX(s2.start_time) as last_activity
FROM participants p
LEFT JOIN sessions s2 ON p.id = s2.participant_id
LEFT JOIN timeline_points tp ON p.id = tp.participant_id
GROUP BY p.id, p.age, p.gender, p.handedness, p.created_at;

-- session_detailビューの再作成
DROP VIEW IF EXISTS session_detail CASCADE;
CREATE VIEW session_detail AS
SELECT
  s.id as session_id,
  s.participant_id,
  p.age,
  p.gender,
  p.handedness,
  s.session_type,
  s.session_index,
  s.start_time,
  s.end_time,
  (
    SELECT json_agg(
      json_build_object(
        'time', tp.time,
        'word', tp.word,
        'event_type', tp.event_type,
        'reaction_value', tp.reaction_value,
        'reaction_time', tp.reaction_time,
        'has_response', tp.has_response
      ) ORDER BY tp.time ASC
    )
    FROM timeline_points tp
    WHERE tp.participant_id = s.participant_id
    AND tp.session_id = s.id
  ) as responses,
  (
    SELECT COUNT(*) FROM timeline_points tp2
    WHERE tp2.participant_id = s.participant_id
    AND tp2.session_id = s.id
    AND tp2.has_response = TRUE
  ) as response_count,
  (
    SELECT AVG(tp3.reaction_value) FROM timeline_points tp3
    WHERE tp3.participant_id = s.participant_id
    AND tp3.session_id = s.id
  ) as average_reaction_value
FROM sessions s
JOIN participants p ON s.participant_id = p.id;

-- participant_summaryビューの再作成
DROP VIEW IF EXISTS participant_summary CASCADE;
CREATE VIEW participant_summary AS
SELECT
  p.id as participant_id,
  p.age,
  p.gender,
  p.handedness,
  p.created_at as participant_created_at,
  COUNT(DISTINCT s.id) as session_count,
  COUNT(*) FILTER (WHERE tp.has_response = TRUE) as total_responses,
  MAX(tp.reaction_value) as max_reaction_value,
  AVG(tp.reaction_value) as avg_reaction_value,
  MAX(s.start_time) as last_activity,
  (
    SELECT json_agg(
      json_build_object(
        'id', s2.id,
        'session_index', s2.session_index,
        'session_type', s2.session_type,
        'start_time', s2.start_time,
        'end_time', s2.end_time,
        'response_count', (
          SELECT COUNT(*) FROM timeline_points tp2
          WHERE tp2.participant_id = p.id
          AND tp2.session_id = s2.id
          AND tp2.has_response = TRUE
        )
      ) ORDER BY s2.start_time DESC
    )
    FROM sessions s2
    WHERE s2.participant_id = p.id
  ) as sessions
FROM participants p
LEFT JOIN sessions s ON p.id = s.participant_id
LEFT JOIN timeline_points tp ON p.id = tp.participant_id
GROUP BY p.id, p.age, p.gender, p.handedness, p.created_at;

-- 権限の再付与
GRANT SELECT ON participant_summary TO authenticated;
GRANT SELECT ON session_detail TO authenticated;
GRANT SELECT ON participant_detail TO authenticated;

