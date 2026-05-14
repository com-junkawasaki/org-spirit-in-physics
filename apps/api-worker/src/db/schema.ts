import type { Insertable, Selectable, Updateable } from 'kysely';

export interface ParticipantsTable {
  id: string;
  email: string | null;
  age_group: string | null;
  gender: string | null;
  ethnicity: string | null;
  income_range: string | null;
  medical_history_json: string | null;
  is_public: number;
  created_at_ms: number;
  updated_at_ms: number;
}

export interface AssessmentEventsTable {
  id: string;
  participant_id: string;
  event_type: string;
  payload_json: string;
  created_at_ms: number;
}

export interface SessionsTable {
  id: string;
  participant_id: string;
  session_index: number;
  status: string;
  start_ts_ms: number;
  end_ts_ms: number | null;
  created_at_ms: number;
  updated_at_ms: number;
}

export interface ArtifactsTable {
  id: string;
  participant_id: string;
  session_index: number;
  artifact_type: string;
  file_name: string;
  content_type: string;
  object_key: string;
  public_url: string;
  created_at_ms: number;
}

export interface GraphRunsTable {
  id: string;
  graph_name: string;
  participant_id: string | null;
  session_id: string | null;
  status: string;
  input_json: string;
  output_json: string | null;
  error_json: string | null;
  created_at_ms: number;
  updated_at_ms: number;
}

export interface GraphCheckpointsTable {
  id: string;
  run_id: string;
  step_index: number;
  channel_values_json: string;
  pending_writes_json: string | null;
  created_at_ms: number;
}

export interface GraphNodeEventsTable {
  id: string;
  run_id: string;
  step_index: number;
  node_name: string;
  input_json: string | null;
  output_json: string | null;
  status: string;
  created_at_ms: number;
}

export interface AggregateSnapshotsTable {
  id: string;
  participant_id: string;
  session_id: string;
  aggregate_type: string;
  payload_json: string;
  first_ts_ms: number | null;
  last_ts_ms: number | null;
  updated_at_ms: number;
}

export interface Database {
  participants: ParticipantsTable;
  assessment_events: AssessmentEventsTable;
  sessions: SessionsTable;
  artifacts: ArtifactsTable;
  graph_runs: GraphRunsTable;
  graph_checkpoints: GraphCheckpointsTable;
  graph_node_events: GraphNodeEventsTable;
  aggregate_snapshots: AggregateSnapshotsTable;
}

export type ParticipantRow = Selectable<ParticipantsTable>;
export type NewParticipantRow = Insertable<ParticipantsTable>;
export type ParticipantPatch = Updateable<ParticipantsTable>;

export type AssessmentEventRow = Selectable<AssessmentEventsTable>;
export type NewAssessmentEventRow = Insertable<AssessmentEventsTable>;

export type SessionRow = Selectable<SessionsTable>;
export type NewSessionRow = Insertable<SessionsTable>;
export type SessionPatch = Updateable<SessionsTable>;

export type ArtifactRow = Selectable<ArtifactsTable>;
export type NewArtifactRow = Insertable<ArtifactsTable>;

export type GraphRunRow = Selectable<GraphRunsTable>;
export type NewGraphRunRow = Insertable<GraphRunsTable>;
export type GraphRunPatch = Updateable<GraphRunsTable>;

export type GraphCheckpointRow = Selectable<GraphCheckpointsTable>;
export type NewGraphCheckpointRow = Insertable<GraphCheckpointsTable>;

export type GraphNodeEventRow = Selectable<GraphNodeEventsTable>;
export type NewGraphNodeEventRow = Insertable<GraphNodeEventsTable>;

export type AggregateSnapshotRow = Selectable<AggregateSnapshotsTable>;
export type NewAggregateSnapshotRow = Insertable<AggregateSnapshotsTable>;
