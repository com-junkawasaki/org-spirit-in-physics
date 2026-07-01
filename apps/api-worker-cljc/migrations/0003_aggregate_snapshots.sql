CREATE TABLE IF NOT EXISTS aggregate_snapshots (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  first_ts_ms INTEGER,
  last_ts_ms INTEGER,
  updated_at_ms INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS aggregate_snapshots_unique_idx
  ON aggregate_snapshots(participant_id, session_id, aggregate_type);

CREATE INDEX IF NOT EXISTS aggregate_snapshots_participant_idx
  ON aggregate_snapshots(participant_id, updated_at_ms);
