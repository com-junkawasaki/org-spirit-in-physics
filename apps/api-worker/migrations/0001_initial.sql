CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  email TEXT,
  age_group TEXT,
  gender TEXT,
  ethnicity TEXT,
  income_range TEXT,
  medical_history_json TEXT,
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS participants_email_idx ON participants(email);

CREATE TABLE IF NOT EXISTS assessment_events (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS assessment_events_participant_idx
  ON assessment_events(participant_id, created_at_ms);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  session_index INTEGER NOT NULL,
  status TEXT NOT NULL,
  start_ts_ms INTEGER NOT NULL,
  end_ts_ms INTEGER,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS sessions_participant_session_idx
  ON sessions(participant_id, session_index);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  session_index INTEGER NOT NULL,
  artifact_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  object_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS artifacts_participant_session_idx
  ON artifacts(participant_id, session_index, created_at_ms);
