-- SQL schema for sqlc
-- This file contains the table definitions needed for sqlc code generation

-- Note: This is a reference schema. The actual schema is managed in supabase/migrations/
-- This file is used by sqlc to generate type-safe Go code

-- Participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY,
  age INTEGER,
  gender TEXT, -- ENUM型だが、sqlcではTEXTとして扱う
  handedness TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
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
  pronunciation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Timeline points table (TimescaleDB hypertable)
CREATE TABLE timeline_points (
  time TIMESTAMPTZ NOT NULL,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
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
  timeline_point_participant_id UUID NOT NULL,
  timeline_point_session_id UUID NOT NULL,
  emotion_name TEXT NOT NULL, -- emotion_name_enum
  score DOUBLE PRECISION NOT NULL,
  file_type TEXT NOT NULL, -- emotion_file_type_enum
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (time, participant_id, session_id) 
    REFERENCES timeline_points(time, participant_id, session_id) ON DELETE CASCADE
);

-- Physiological measurements table
CREATE TABLE physiological_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_point_time TIMESTAMPTZ NOT NULL,
  timeline_point_participant_id UUID NOT NULL,
  timeline_point_session_id UUID NOT NULL,
  measurement_type TEXT NOT NULL, -- measurement_type_enum
  value DOUBLE PRECISION NOT NULL,
  unit TEXT, -- measurement_unit_enum
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (time, participant_id, session_id) 
    REFERENCES timeline_points(time, participant_id, session_id) ON DELETE CASCADE
);

-- Materialized views (for reference, not used in sqlc queries directly)
-- timeline_word_aggregates_by_session
-- timeline_emotion_vectors_by_word
-- timeline_word_statistics_by_session
