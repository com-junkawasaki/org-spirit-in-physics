-- SQL schema for sqlc
-- This file contains the table definitions needed for sqlc code generation

-- Note: This is a reference schema. The actual schema is managed in migrations/
-- This file is used by sqlc to generate type-safe Go code

-- Participants table
CREATE TABLE participants (
  id TEXT PRIMARY KEY,
  age INTEGER,
  gender TEXT, -- ENUM型だが、sqlcではTEXTとして扱う
  handedness TEXT,
  email TEXT,
  age_group TEXT,
  ethnicity TEXT,
  income_range TEXT,
  medical_history TEXT[],
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  session_index INTEGER,
  start_ts BIGINT NOT NULL,
  end_ts BIGINT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE(participant_id, session_index)
);

-- Session events table
CREATE TABLE session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- session_event_type_enum
  event_timestamp BIGINT NOT NULL,
  event_data JSONB,
  word_id INTEGER,
  reaction_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stimulus words table
CREATE TABLE stimulus_words (
  id INTEGER PRIMARY KEY,
  japanese TEXT NOT NULL,
  english TEXT NOT NULL,
  french TEXT,
  spanish TEXT,
  russian TEXT,
  arabic TEXT,
  chinese TEXT,
  pronunciation TEXT NOT NULL,
  audio_ja BYTEA,
  audio_en BYTEA,
  audio_fr BYTEA,
  audio_es BYTEA,
  audio_ru BYTEA,
  audio_ar BYTEA,
  audio_zh BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Timeline points table (TimescaleDB hypertable)
CREATE TABLE timeline_points (
  time TIMESTAMPTZ NOT NULL,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  word TEXT,
  event_type TEXT,
  reaction_value DOUBLE PRECISION,
  reaction_time DOUBLE PRECISION,
  has_response BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (time, participant_id, session_id)
);

-- Timeline emotion entries table
CREATE TABLE timeline_emotion_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_point_time TIMESTAMPTZ NOT NULL,
  timeline_point_participant_id TEXT NOT NULL,
  timeline_point_session_id UUID NOT NULL,
  emotion_name TEXT NOT NULL, -- emotion_name_enum
  score DOUBLE PRECISION NOT NULL,
  file_type TEXT NOT NULL, -- emotion_file_type_enum
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (timeline_point_time, timeline_point_participant_id, timeline_point_session_id) 
    REFERENCES timeline_points(time, participant_id, session_id) ON DELETE CASCADE
);

-- Physiological measurements table
CREATE TABLE physiological_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_point_time TIMESTAMPTZ NOT NULL,
  timeline_point_participant_id TEXT NOT NULL,
  timeline_point_session_id UUID NOT NULL,
  measurement_type TEXT NOT NULL, -- measurement_type_enum
  value DOUBLE PRECISION NOT NULL,
  unit TEXT, -- measurement_unit_enum
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (timeline_point_time, timeline_point_participant_id, timeline_point_session_id) 
    REFERENCES timeline_points(time, participant_id, session_id) ON DELETE CASCADE
);

-- Materialized views (for sqlc code generation)
-- These views are used in queries/timeline.sql

-- 1. timeline_word_aggregates_by_session
CREATE MATERIALIZED VIEW timeline_word_aggregates_by_session AS
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
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
    ) as avg_physiological,
    SUM(
        (SELECT ABS(AVG(pm.value))
         FROM physiological_measurements pm
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
    ) as sum_phys_abs,
    ARRAY_AGG(
        (SELECT AVG(pm.value)
         FROM physiological_measurements pm
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
        ORDER BY tp.time
    ) FILTER (WHERE EXISTS (
        SELECT 1 FROM physiological_measurements pm
        WHERE pm.timeline_point_time = tp.time
          AND pm.timeline_point_participant_id = tp.participant_id
          AND pm.timeline_point_session_id = tp.session_id
    )) as phys_series,
    ARRAY_AGG(tp.reaction_time ORDER BY tp.time) FILTER (WHERE tp.reaction_time IS NOT NULL) as rt_series,
    ARRAY_AGG(tp.reaction_value ORDER BY tp.time) FILTER (WHERE tp.reaction_value IS NOT NULL) as rv_series,
    MIN(tp.time) as first_time,
    MAX(tp.time) as last_time
FROM timeline_points tp
WHERE tp.word IS NOT NULL
GROUP BY tp.participant_id, tp.session_id, tp.word;

-- 2. timeline_emotion_vectors_by_word
CREATE MATERIALIZED VIEW timeline_emotion_vectors_by_word AS
SELECT
    tp.participant_id,
    tp.session_id,
    tp.word,
    SUM(CASE WHEN tee.emotion_name::text = 'joy' THEN tee.score ELSE 0 END) as joy_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'sadness' THEN tee.score ELSE 0 END) as sadness_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'anger' THEN tee.score ELSE 0 END) as anger_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'fear' THEN tee.score ELSE 0 END) as fear_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'surprise' THEN tee.score ELSE 0 END) as surprise_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'disgust' THEN tee.score ELSE 0 END) as disgust_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'calm' THEN tee.score ELSE 0 END) as calm_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'focus' THEN tee.score ELSE 0 END) as focus_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'excitement' THEN tee.score ELSE 0 END) as excitement_sum,
    SUM(CASE WHEN tee.emotion_name::text = 'confusion' THEN tee.score ELSE 0 END) as confusion_sum,
    COUNT(tee.id) as emotion_entry_count,
    COALESCE(
        (SELECT json_object_agg(file_type, emotions_json)
         FROM (
           SELECT
             tee2.file_type::text as file_type,
             json_agg(
               json_build_object(
                 'name', tee2.emotion_name::text,
                 'score', tee2.score
               )
             ) as emotions_json
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
WHERE tp.word IS NOT NULL
GROUP BY tp.participant_id, tp.session_id, tp.word;

-- 3. timeline_word_statistics_by_session
CREATE MATERIALIZED VIEW timeline_word_statistics_by_session AS
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
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
    ) as avg_physiological,
    STDDEV(
        (SELECT AVG(pm.value)
         FROM physiological_measurements pm
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
    ) as std_physiological,
    VARIANCE(
        (SELECT AVG(pm.value)
         FROM physiological_measurements pm
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
    ) as var_physiological,
    -- speed_index: reaction_timeの逆数（速いほど高い値）
    CASE
        WHEN AVG(tp.reaction_time) > 0 THEN 1.0 / AVG(tp.reaction_time)
        ELSE 0
    END as speed_index,
    ARRAY_AGG(
        (SELECT AVG(pm.value)
         FROM physiological_measurements pm
         WHERE pm.timeline_point_time = tp.time
           AND pm.timeline_point_participant_id = tp.participant_id
           AND pm.timeline_point_session_id = tp.session_id)
        ORDER BY tp.time
    ) FILTER (WHERE EXISTS (
        SELECT 1 FROM physiological_measurements pm
        WHERE pm.timeline_point_time = tp.time
          AND pm.timeline_point_participant_id = tp.participant_id
          AND pm.timeline_point_session_id = tp.session_id
    )) as phys_series,
    ARRAY_AGG(tp.reaction_time ORDER BY tp.time) FILTER (WHERE tp.reaction_time IS NOT NULL) as rt_series
FROM timeline_points tp
WHERE tp.word IS NOT NULL
GROUP BY tp.participant_id, tp.session_id, tp.word;
