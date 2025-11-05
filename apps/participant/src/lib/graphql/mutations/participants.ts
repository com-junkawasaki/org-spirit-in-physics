//! GraphQL Mutation: Participants
//! 
//! Merkle DAG: graphql.mutations.participants.participant
//! OWL: spirit:Participant mutation

import { gql } from '@apollo/client';

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

export const SAVE_CONSENT = gql`
  mutation SaveConsent($input: ConsentInput!) {
    saveConsent(input: $input) {
      id
      participantId
      signature
      agreements
      agreedAt
      consentVersion
      studyId
      userAgent
      ipAddress
      consentText
      createdAt
      updatedAt
    }
  }
`;

