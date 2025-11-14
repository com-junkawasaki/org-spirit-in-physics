-- Merkle DAG: jsonb_migration -> normalized_data_migration
-- 既存のJSONBデータを正規化テーブルに移行

-- 1. burst_emotion_dataのemotion_scoresを移行
INSERT INTO burst_emotion_scores (burst_emotion_data_id, emotion_name_id, score)
SELECT 
  bed.id as burst_emotion_data_id,
  en.id as emotion_name_id,
  (emotion_data.value)::DOUBLE PRECISION as score
FROM burst_emotion_data bed,
  LATERAL jsonb_each(bed.emotion_scores) as emotion_data
JOIN emotion_names en ON en.name = emotion_data.key
WHERE bed.emotion_scores != '{}'::jsonb
  AND (emotion_data.value)::TEXT ~ '^[0-9]+\.?[0-9]*$'
ON CONFLICT (burst_emotion_data_id, emotion_name_id) DO NOTHING;

-- 2. face_emotion_dataのemotion_scoresを移行
INSERT INTO face_emotion_scores (face_emotion_data_id, emotion_name_id, score)
SELECT 
  fed.id as face_emotion_data_id,
  en.id as emotion_name_id,
  (emotion_data.value)::DOUBLE PRECISION as score
FROM face_emotion_data fed,
  LATERAL jsonb_each(fed.emotion_scores) as emotion_data
JOIN emotion_names en ON en.name = emotion_data.key
WHERE fed.emotion_scores != '{}'::jsonb
  AND (emotion_data.value)::TEXT ~ '^[0-9]+\.?[0-9]*$'
ON CONFLICT (face_emotion_data_id, emotion_name_id) DO NOTHING;

-- 3. language_emotion_dataのemotion_scoresを移行
INSERT INTO language_emotion_scores (language_emotion_data_id, emotion_name_id, score)
SELECT 
  led.id as language_emotion_data_id,
  en.id as emotion_name_id,
  (emotion_data.value)::DOUBLE PRECISION as score
FROM language_emotion_data led,
  LATERAL jsonb_each(led.emotion_scores) as emotion_data
JOIN emotion_names en ON en.name = emotion_data.key
WHERE led.emotion_scores != '{}'::jsonb
  AND (emotion_data.value)::TEXT ~ '^[0-9]+\.?[0-9]*$'
ON CONFLICT (language_emotion_data_id, emotion_name_id) DO NOTHING;

-- 4. prosody_emotion_dataのemotion_scoresを移行
INSERT INTO prosody_emotion_scores (prosody_emotion_data_id, emotion_name_id, score)
SELECT 
  ped.id as prosody_emotion_data_id,
  en.id as emotion_name_id,
  (emotion_data.value)::DOUBLE PRECISION as score
FROM prosody_emotion_data ped,
  LATERAL jsonb_each(ped.emotion_scores) as emotion_data
JOIN emotion_names en ON en.name = emotion_data.key
WHERE ped.emotion_scores != '{}'::jsonb
  AND (emotion_data.value)::TEXT ~ '^[0-9]+\.?[0-9]*$'
ON CONFLICT (prosody_emotion_data_id, emotion_name_id) DO NOTHING;

-- 5. language_emotion_dataのtoxicity_scoresを移行
INSERT INTO toxicity_scores (language_emotion_data_id, toxicity_type, score)
SELECT 
  led.id as language_emotion_data_id,
  jsonb_object_keys(led.toxicity_scores)::TEXT as toxicity_type,
  (led.toxicity_scores->>jsonb_object_keys(led.toxicity_scores))::DOUBLE PRECISION as score
FROM language_emotion_data led
WHERE led.toxicity_scores != '{}'::jsonb
ON CONFLICT (language_emotion_data_id, toxicity_type) DO NOTHING;

-- 6. face_emotion_dataのau_scoresを移行
INSERT INTO action_unit_scores (face_emotion_data_id, au_number, score)
SELECT 
  fed.id as face_emotion_data_id,
  (jsonb_object_keys(fed.au_scores))::INTEGER as au_number,
  (fed.au_scores->>jsonb_object_keys(fed.au_scores))::DOUBLE PRECISION as score
FROM face_emotion_data fed
WHERE fed.au_scores != '{}'::jsonb
ON CONFLICT (face_emotion_data_id, au_number) DO NOTHING;

-- 7. timeline_pointsのemotionsを移行
INSERT INTO timeline_emotion_entries (
  timeline_point_time,
  timeline_point_participant_id,
  timeline_point_session_id,
  emotion_name_id,
  score,
  file_type
)
SELECT 
  tp.time as timeline_point_time,
  tp.participant_id as timeline_point_participant_id,
  tp.session_id as timeline_point_session_id,
  en.id as emotion_name_id,
  (emotion->>'score')::DOUBLE PRECISION as score,
  (emotion->>'fileType')::TEXT as file_type
FROM timeline_points tp,
  LATERAL jsonb_array_elements(tp.emotions) as emotion
JOIN emotion_names en ON en.name = (emotion->>'name')::TEXT
WHERE tp.emotions != '[]'::jsonb
ON CONFLICT (timeline_point_time, timeline_point_participant_id, timeline_point_session_id, emotion_name_id, file_type) DO NOTHING;

-- 8. timeline_pointsのphysiologicalを移行
INSERT INTO physiological_measurements (
  timeline_point_time,
  timeline_point_participant_id,
  timeline_point_session_id,
  measurement_type_id,
  value
)
SELECT 
  tp.time as timeline_point_time,
  tp.participant_id as timeline_point_participant_id,
  tp.session_id as timeline_point_session_id,
  pmt.id as measurement_type_id,
  (tp.physiological->>measurement_key)::DOUBLE PRECISION as value
FROM timeline_points tp,
  LATERAL jsonb_object_keys(tp.physiological) as measurement_key
JOIN physiological_measurement_types pmt ON pmt.measurement_type = measurement_key
WHERE tp.physiological != '{}'::jsonb
  AND tp.physiological->>measurement_key IS NOT NULL
  AND (tp.physiological->>measurement_key)::TEXT ~ '^[0-9]+\.?[0-9]*$'
ON CONFLICT (timeline_point_time, timeline_point_participant_id, timeline_point_session_id, measurement_type_id) DO NOTHING;

-- 9. sessionsのeventsを移行
INSERT INTO session_events (
  session_id,
  event_type_id,
  event_timestamp,
  event_data,
  word_id,
  reaction_time_ms
)
SELECT 
  s.id as session_id,
  et.id as event_type_id,
  COALESCE((event->>'timestamp')::BIGINT, s.start_ts) as event_timestamp,
  (event->>'data')::TEXT as event_data,
  CASE 
    WHEN (event->>'word_id') IS NOT NULL THEN (event->>'word_id')::INTEGER
    ELSE NULL
  END as word_id,
  (event->>'reaction_time_ms')::INTEGER as reaction_time_ms
FROM sessions s,
  LATERAL jsonb_array_elements(s.events) as event
JOIN event_types et ON et.event_type = (event->>'type')::TEXT
WHERE s.events != '[]'::jsonb
ON CONFLICT DO NOTHING;

-- 10. participant_consentsのagreementsを移行
INSERT INTO consent_agreements (
  participant_consent_id,
  agreement_type_id,
  agreed
)
SELECT 
  pc.id as participant_consent_id,
  at.id as agreement_type_id,
  (pc.agreements->>jsonb_object_keys(pc.agreements))::BOOLEAN as agreed
FROM participant_consents pc,
  LATERAL jsonb_object_keys(pc.agreements) as agreement_key
JOIN agreement_types at ON at.agreement_type = agreement_key
WHERE pc.agreements != '{}'::jsonb
ON CONFLICT (participant_consent_id, agreement_type_id) DO NOTHING;

-- 11. burst_emotion_dataのvocal_typesを移行
INSERT INTO vocal_type_entries (burst_emotion_data_id, vocal_type)
SELECT 
  bed.id as burst_emotion_data_id,
  jsonb_array_elements_text(bed.vocal_types) as vocal_type
FROM burst_emotion_data bed
WHERE bed.vocal_types != '[]'::jsonb
ON CONFLICT (burst_emotion_data_id, vocal_type) DO NOTHING;

