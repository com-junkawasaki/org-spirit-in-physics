/**
 * Merkle DAG: graphql.mutations
 * GraphQL mutations for participant and session data
 */

import { gql } from '@apollo/client';

// Create Participant Mutation
export const CREATE_PARTICIPANT = gql`
  mutation CreateParticipant($input: CreateParticipantInput!) {
    create_participant(input: $input) {
      id
      age
      gender
      handedness
      created_at
      updated_at
    }
  }
`;

// Create Session Mutation
export const CREATE_SESSION = gql`
  mutation CreateSession($input: CreateSessionInput!) {
    create_session(input: $input) {
      id
      participant_id
      session_index
      start_ts
      end_ts
      events
      created_at
      updated_at
    }
  }
`;

// Upload artifact (video, audio, etc.) to Supabase Storage
export const UPLOAD_ARTIFACT = gql`
  mutation UploadArtifact($input: UploadArtifactInput!) {
    upload_artifact(input: $input)
  }
`;

