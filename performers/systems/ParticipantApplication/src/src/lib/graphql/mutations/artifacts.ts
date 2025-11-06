//! GraphQL Mutation: Artifacts
//! 
//! Merkle DAG: graphql.mutations.artifacts.participant
//! OWL: spirit:Video mutation

import { gql } from '@apollo/client';

export const SAVE_VIDEO = gql`
  mutation SaveVideo($input: SaveVideoInput!) {
    saveVideo(input: $input) {
      success
      fileUrl
      fileName
      message
    }
  }
`;

