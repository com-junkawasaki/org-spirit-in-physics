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
        ),
        'analysis_count', (
          SELECT COUNT(*) FROM participant_analysis_results par
          WHERE par.participant_id = p.id AND par.session_id = s.id
        ),
        'average_spirit_probability', (
          SELECT AVG(par2.spirit_probability) FROM participant_analysis_results par2
          WHERE par2.participant_id = p.id AND par2.session_id = s.id
        )
      ) ORDER BY s.start_time DESC
    )
    FROM sessions s
    WHERE s.participant_id = p.id
  ) as sessions,
  -- Analysis results summary
  (
    SELECT json_agg(
      json_build_object(
        'id', par.id,
        'stimulus_word', ws.word,
        'response_word', par.response_word,
        'spirit_probability', par.spirit_probability,
        'reaction_time_ms', par.reaction_time_ms,
        'created_at', par.created_at,
        'word2vec_component', par.word2vec_component,
        'reaction_time_component', par.reaction_time_component,
        'skin_potential_component', par.skin_potential_component,
        'emotion_component', par.emotion_component
      ) ORDER BY par.created_at DESC
    )
    FROM participant_analysis_results par
    JOIN word_stimuli ws ON par.word_stimulus_id = ws.id
    WHERE par.participant_id = p.id
  ) as analysis_results,
  -- Overall statistics
  COUNT(DISTINCT s2.id) as total_sessions,
  COUNT(tp.id) FILTER (WHERE tp.has_response = TRUE) as total_responses,
  AVG(par.spirit_probability) as overall_average_spirit_probability,
  MAX(par.created_at) as last_analysis_date
FROM participants p
LEFT JOIN sessions s2 ON p.id = s2.participant_id
LEFT JOIN timeline_points tp ON p.id = tp.participant_id
LEFT JOIN participant_analysis_results par ON p.id = par.participant_id
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
  -- Analysis results for this session
  (
    SELECT json_agg(
      json_build_object(
        'id', par.id,
        'word_stimulus_id', par.word_stimulus_id,
        'stimulus_word', ws.word,
        'response_word', par.response_word,
        'spirit_probability', par.spirit_probability,
        'reaction_time_ms', par.reaction_time_ms,
        'word2vec_component', par.word2vec_component,
        'reaction_time_component', par.reaction_time_component,
        'skin_potential_component', par.skin_potential_component,
        'emotion_component', par.emotion_component,
        'created_at', par.created_at
      ) ORDER BY par.created_at ASC
    )
    FROM participant_analysis_results par
    JOIN word_stimuli ws ON par.word_stimulus_id = ws.id
    WHERE par.participant_id = s.participant_id
    AND par.session_id = s.id
  ) as analysis_results,
  -- Session statistics
  (
    SELECT COUNT(*) FROM timeline_points tp2
    WHERE tp2.participant_id = s.participant_id
    AND tp2.session_id = s.id
    AND tp2.has_response = TRUE
  ) as response_count,
  (
    SELECT COUNT(*) FROM participant_analysis_results par2
    WHERE par2.participant_id = s.participant_id
    AND par2.session_id = s.id
  ) as analysis_count,
  (
    SELECT AVG(par3.spirit_probability) FROM participant_analysis_results par3
    WHERE par3.participant_id = s.participant_id
    AND par3.session_id = s.id
  ) as average_spirit_probability
FROM sessions s
JOIN participants p ON s.participant_id = p.id;

-- analysis_result_detailビューの更新
DROP VIEW IF EXISTS analysis_result_detail CASCADE;
CREATE VIEW analysis_result_detail AS
SELECT
  par.id as analysis_result_id,
  par.participant_id,
  p.age,
  p.gender,
  p.handedness,
  par.session_id,
  s.session_type,
  s.start_time as session_start_time,
  par.word_stimulus_id,
  ws.word as stimulus_word,
  par.response_word,
  par.reaction_time_ms,
  par.spirit_probability,
  par.word2vec_component,
  par.reaction_time_component,
  par.skin_potential_component,
  par.emotion_component,
  par.created_at,
  -- Component breakdown for visualization
  json_build_object(
    'word2vec', par.word2vec_component,
    'reaction_time', par.reaction_time_component,
    'skin_potential', par.skin_potential_component,
    'emotion', par.emotion_component
  ) as component_breakdown
FROM participant_analysis_results par
JOIN participants p ON par.participant_id = p.id
JOIN sessions s ON par.session_id = s.id
JOIN word_stimuli ws ON par.word_stimulus_id = ws.id;

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
  -- Analysis statistics
  AVG(par.spirit_probability) as average_spirit_probability,
  MAX(par.created_at) as last_analysis_date,
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
LEFT JOIN participant_analysis_results par ON p.id = par.participant_id
GROUP BY p.id, p.age, p.gender, p.handedness, p.created_at;

-- 権限の再付与
GRANT SELECT ON participant_summary TO authenticated;
GRANT SELECT ON participant_detail TO authenticated;
GRANT SELECT ON session_detail TO authenticated;
GRANT SELECT ON analysis_result_detail TO authenticated;

