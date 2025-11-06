//! GraphQL Mutation: Execute Activity
//! 
//! Merkle DAG: graphql.mutations.activities
//! OWL: spirit:Process execution mutation

import { gql } from '@apollo/client';

export const EXECUTE_ACTIVITY = gql`
  mutation ExecuteActivity($activityId: String!, $inputs: JSON!) {
    executeActivity(activityId: $activityId, inputs: $inputs) {
      success
      result
      error
    }
  }
`;

