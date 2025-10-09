-- Merkle DAG: analysis_results_schema -> analysis_views_schema

-- Create view for participant summary data (for participant list page)
CREATE OR REPLACE VIEW participant_summary AS
SELECT
  p.id as participant_id,
  p.age,
  p.gender,
  p.handedness,
  p.created_at as participant_created_at,
  -- Session statistics
  COUNT(DISTINCT pes.id) as session_count,
  COUNT(prd.id) as total_responses,
  -- Analysis statistics
  AVG(par.spirit_probability) as average_spirit_probability,
  MAX(par.created_at) as last_analysis_date,
  MAX(pes.start_time) as last_activity,
  -- Latest session info
  (
    SELECT json_agg(
      json_build_object(
        'id', pes2.id,
        'session_type', pes2.session_type,
        'start_time', pes2.start_time,
        'end_time', pes2.end_time,
        'response_count', (
          SELECT COUNT(*) FROM participant_response_data prd2
          WHERE prd2.participant_id = p.id
          AND prd2.experiment_id = pes2.id
        )
      ) ORDER BY pes2.start_time DESC
    )
    FROM participant_experiment_sessions pes2
    WHERE pes2.participant_id = p.id
  ) as sessions
FROM participants p
LEFT JOIN participant_experiment_sessions pes ON p.id = pes.participant_id
LEFT JOIN participant_response_data prd ON p.id = prd.participant_id
LEFT JOIN participant_analysis_results par ON p.id = par.participant_id
GROUP BY p.id, p.age, p.gender, p.handedness, p.created_at;

-- Create view for participant detailed data (for participant detail page)
CREATE OR REPLACE VIEW participant_detail AS
SELECT
  p.id as participant_id,
  p.age,
  p.gender,
  p.handedness,
  p.created_at as participant_created_at,
  -- Session details
  (
    SELECT json_agg(
      json_build_object(
        'id', pes.id,
        'session_type', pes.session_type,
        'start_time', pes.start_time,
        'end_time', pes.end_time,
        'response_count', (
          SELECT COUNT(*) FROM participant_response_data prd
          WHERE prd.participant_id = p.id AND prd.experiment_id = pes.id
        ),
        'analysis_count', (
          SELECT COUNT(*) FROM participant_analysis_results par
          WHERE par.participant_id = p.id AND par.experiment_id = pes.id
        ),
        'average_spirit_probability', (
          SELECT AVG(par2.spirit_probability) FROM participant_analysis_results par2
          WHERE par2.participant_id = p.id AND par2.experiment_id = pes.id
        )
      ) ORDER BY pes.start_time DESC
    )
    FROM participant_experiment_sessions pes
    WHERE pes.participant_id = p.id
  ) as sessions,
  -- Analysis results summary
  (
    SELECT json_agg(
      json_build_object(
        'id', par.id,
        'stimulus_word', par.stimulus_word,
        'response_word', par.response_word,
        'spirit_probability', par.spirit_probability,
        'reaction_time_ms', par.reaction_time_ms,
        'created_at', par.created_at,
        'word2vec_component', par.word2vec_component,
        'reaction_time_component', par.reaction_time_component,
        'skin_potential_component', par.skin_potential_component,
        'emotion_component', par.emotion_component,
        'emotion_data', par.emotion_data
      ) ORDER BY par.created_at DESC
    )
    FROM participant_analysis_results par
    WHERE par.participant_id = p.id
  ) as analysis_results,
  -- Overall statistics
  COUNT(DISTINCT pes2.id) as total_sessions,
  COUNT(prd.id) as total_responses,
  AVG(par.spirit_probability) as overall_average_spirit_probability,
  MAX(par.created_at) as last_analysis_date
FROM participants p
LEFT JOIN participant_experiment_sessions pes2 ON p.id = pes2.participant_id
LEFT JOIN participant_response_data prd ON p.id = prd.participant_id
LEFT JOIN participant_analysis_results par ON p.id = par.participant_id
GROUP BY p.id, p.age, p.gender, p.handedness, p.created_at;

-- Create view for session detailed data (for session results page)
CREATE OR REPLACE VIEW session_detail AS
SELECT
  pes.id as session_id,
  pes.participant_id,
  p.age,
  p.gender,
  p.handedness,
  pes.session_type,
  pes.start_time,
  pes.end_time,
  -- Response data for this session
  (
    SELECT json_agg(
      json_build_object(
        'id', prd.id,
        'word_stimulus_id', prd.word_stimulus_id,
        'stimulus_word', prd.stimulus_word,
        'response_word', prd.response_word,
        'reaction_time_ms', prd.reaction_time_ms,
        'timestamp', prd.timestamp,
        'skin_potential', prd.skin_potential,
        'emotion', prd.emotion,
        'emotion_confidence', prd.emotion_confidence
      ) ORDER BY prd.timestamp ASC
    )
    FROM participant_response_data prd
    WHERE prd.participant_id = pes.participant_id
    AND prd.experiment_id = pes.id
  ) as responses,
  -- Analysis results for this session
  (
    SELECT json_agg(
      json_build_object(
        'id', par.id,
        'word_stimulus_id', par.word_stimulus_id,
        'stimulus_word', par.stimulus_word,
        'response_word', par.response_word,
        'spirit_probability', par.spirit_probability,
        'reaction_time_ms', par.reaction_time_ms,
        'word2vec_component', par.word2vec_component,
        'reaction_time_component', par.reaction_time_component,
        'skin_potential_component', par.skin_potential_component,
        'emotion_component', par.emotion_component,
        'emotion_data', par.emotion_data,
        'physiological_data', par.physiological_data,
        'created_at', par.created_at
      ) ORDER BY par.created_at ASC
    )
    FROM participant_analysis_results par
    WHERE par.participant_id = pes.participant_id
    AND par.experiment_id = pes.id
  ) as analysis_results,
  -- Session statistics
  (
    SELECT COUNT(*) FROM participant_response_data prd2
    WHERE prd2.participant_id = pes.participant_id
    AND prd2.experiment_id = pes.id
  ) as response_count,
  (
    SELECT COUNT(*) FROM participant_analysis_results par2
    WHERE par2.participant_id = pes.participant_id
    AND par2.experiment_id = pes.id
  ) as analysis_count,
  (
    SELECT AVG(par3.spirit_probability) FROM participant_analysis_results par3
    WHERE par3.participant_id = pes.participant_id
    AND par3.experiment_id = pes.id
  ) as average_spirit_probability
FROM participant_experiment_sessions pes
JOIN participants p ON pes.participant_id = p.id;

-- Create view for analysis results with participant context (for analysis results page)
CREATE OR REPLACE VIEW analysis_result_detail AS
SELECT
  par.id as analysis_result_id,
  par.participant_id,
  p.age,
  p.gender,
  p.handedness,
  par.experiment_id,
  pes.session_type,
  pes.start_time as session_start_time,
  par.word_stimulus_id,
  par.stimulus_word,
  par.response_word,
  par.reaction_time_ms,
  par.spirit_probability,
  par.word2vec_component,
  par.reaction_time_component,
  par.skin_potential_component,
  par.emotion_component,
  par.emotion_data,
  par.physiological_data,
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
JOIN participant_experiment_sessions pes ON par.experiment_id = pes.id;

-- Grant permissions on views
GRANT SELECT ON participant_summary TO authenticated;
GRANT SELECT ON participant_detail TO authenticated;
GRANT SELECT ON session_detail TO authenticated;
GRANT SELECT ON analysis_result_detail TO authenticated;
