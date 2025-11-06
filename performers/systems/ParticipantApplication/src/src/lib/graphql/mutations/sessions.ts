//! GraphQL Mutation: Sessions
//! 
//! Merkle DAG: graphql.mutations.sessions.participant
//! OWL: spirit:Session mutation

import { gql } from '@apollo/client';

export const SAVE_SESSION = gql`
  mutation SaveSession($input: SaveSessionInput!) {
    saveSession(input: $input) {
      success
      sessionId
      message
    }
  }
`;

