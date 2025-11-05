//! GraphQL Query: Session Events
//! 
//! Merkle DAG: graphql.queries.session_events
//! OWL: spirit:SessionEvent query

import { gql } from '@apollo/client';

export const GET_SESSION_EVENTS = gql`
  query GetSessionEvents($participantId: String!, $sessionId: String!) {
    sessionEvents(participantId: $participantId, sessionId: $sessionId) {
      type
      timestamp
      payload
    }
  }
`;

