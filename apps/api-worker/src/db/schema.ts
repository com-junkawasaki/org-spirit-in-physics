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

export interface Database {
  participants: ParticipantsTable;
  assessment_events: AssessmentEventsTable;
  sessions: SessionsTable;
  artifacts: ArtifactsTable;
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
