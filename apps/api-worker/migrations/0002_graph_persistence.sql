CREATE TABLE IF NOT EXISTS graph_runs (
  id TEXT PRIMARY KEY,
  graph_name TEXT NOT NULL,
  participant_id TEXT,
  session_id TEXT,
  status TEXT NOT NULL,
  input_json TEXT NOT NULL,
  output_json TEXT,
  error_json TEXT,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS graph_runs_participant_idx
  ON graph_runs(participant_id, created_at_ms);

CREATE INDEX IF NOT EXISTS graph_runs_session_idx
  ON graph_runs(session_id, created_at_ms);

CREATE TABLE IF NOT EXISTS graph_checkpoints (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  channel_values_json TEXT NOT NULL,
  pending_writes_json TEXT,
  created_at_ms INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS graph_checkpoints_run_step_idx
  ON graph_checkpoints(run_id, step_index);

CREATE TABLE IF NOT EXISTS graph_node_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  node_name TEXT NOT NULL,
  input_json TEXT,
  output_json TEXT,
  status TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS graph_node_events_run_step_idx
  ON graph_node_events(run_id, step_index);
