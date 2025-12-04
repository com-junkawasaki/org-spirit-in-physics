/**
 * Merkle DAG: graphql.mutations
 * GraphQL mutations for participant and session data
 */

import { gql } from '@apollo/client';

// Create Participant Mutation
export const CREATE_PARTICIPANT = gql`
  mutation CreateParticipant($input: CreateParticipantInput!) {
    createParticipant(input: $input) {
      id
      age
      gender
      handedness
      createdAt
      updatedAt
    }
  }
`;

// Create Session Mutation
export const CREATE_SESSION = gql`
  mutation CreateSession($input: CreateSessionInput!) {
    createSession(input: $input) {
      id
      participantId
      sessionIndex
      startTs
      endTs
      events
      createdAt
      updatedAt
    }
  }
`;

// Upload artifact (video, audio, etc.) to Supabase Storage
export const UPLOAD_ARTIFACT = gql`
  mutation UploadArtifact($input: UploadArtifactInput!) {
    uploadArtifact(input: $input)
  }
`;

