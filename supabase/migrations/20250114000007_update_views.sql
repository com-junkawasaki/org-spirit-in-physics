-- Merkle DAG: views_update -> sessions_based_views
-- ビューをsessionsテーブルと正規化テーブルを参照するように更新

-- participant_detailビューの更新
DROP VIEW IF EXISTS participant_detail CASCADE;
CREATE VIEW participant_detail AS
SELECT
  p.id as participant_id,
  p.age,
  p.gender,
  p.handedness,
  p.created_at as participant_created_at,
  -- Session details (sessionsテーブルを使用)
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
  -- Overall statistics
  COUNT(DISTINCT s2.id) as total_sessions,
  COUNT(tp.id) FILTER (WHERE tp.has_response = TRUE) as total_responses,
  MAX(tp.reaction_value) as max_reaction_value,
  AVG(tp.reaction_value) as avg_reaction_value,
  MAX(s2.start_time) as last_activity
FROM participants p
LEFT JOIN sessions s2 ON p.id = s2.participant_id
LEFT JOIN timeline_points tp ON p.id = tp.participant_id
GROUP BY p.id, p.age, p.gender, p.handedness, p.created_at;

-- session_detailビューの更新
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
  -- Response data for this session (timeline_pointsから)
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
  -- Session statistics
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

-- analysis_result_detailビューは削除（participant_analysis_resultsテーブルが削除されたため）
DROP VIEW IF EXISTS analysis_result_detail CASCADE;

-- participant_summaryビューの更新
DROP VIEW IF EXISTS participant_summary CASCADE;
CREATE VIEW participant_summary AS
SELECT
  p.id as participant_id,
  p.age,
  p.gender,
  p.handedness,
  p.created_at as participant_created_at,
  -- Session statistics
  COUNT(DISTINCT s.id) as session_count,
  COUNT(*) FILTER (WHERE tp.has_response = TRUE) as total_responses,
  -- Analysis statistics (timeline_pointsから計算)
  MAX(tp.reaction_value) as max_reaction_value,
  AVG(tp.reaction_value) as avg_reaction_value,
  MAX(s.start_time) as last_activity,
  -- Latest session info
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
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'participant_detail') THEN
    GRANT SELECT ON participant_detail TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'session_detail') THEN
    GRANT SELECT ON session_detail TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'analysis_result_detail') THEN
    GRANT SELECT ON analysis_result_detail TO authenticated;
  END IF;
END $$;

