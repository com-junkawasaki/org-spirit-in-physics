//! GraphQL Query: Participants
//! 
//! Merkle DAG: graphql.queries.participants.participant
//! OWL: spirit:Participant query

import { gql } from '@apollo/client';

export const GET_PARTICIPANTS = gql`
  query GetParticipants {
    participants {
      id
      age
      gender
      handedness
      createdAt
      updatedAt
    }
  }
`;

export const GET_PARTICIPANT = gql`
  query GetParticipant($id: ID!) {
    participant(id: $id) {
      id
      age
      gender
      handedness
      createdAt
      updatedAt
    }
  }
`;

