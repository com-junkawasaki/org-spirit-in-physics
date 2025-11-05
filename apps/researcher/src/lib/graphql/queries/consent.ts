//! GraphQL Query: Consent
//! 
//! Merkle DAG: graphql.queries.consent
//! OWL: spirit:Consent query

import { gql } from '@apollo/client';

export const GET_CONSENT = gql`
  query GetConsent($participantId: String!) {
    consent(participantId: $participantId) {
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

