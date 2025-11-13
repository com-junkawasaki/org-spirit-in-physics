/**
 * Merkle DAG: graphql.hooks
 * React hooks for GraphQL operations
 */

import { useMutation, useQuery } from '@apollo/client';
import { CREATE_PARTICIPANT, CREATE_SESSION } from './mutations';
import { GET_PARTICIPANT, GET_SESSIONS } from './queries';

// Hook for creating a participant
export function useCreateParticipant() {
  return useMutation(CREATE_PARTICIPANT, {
    errorPolicy: 'all',
  });
}

// Hook for creating a session
export function useCreateSession() {
  return useMutation(CREATE_SESSION, {
    errorPolicy: 'all',
  });
}

// Hook for getting a participant
export function useParticipant(id: string) {
  return useQuery(GET_PARTICIPANT, {
    variables: { id },
    skip: !id,
    errorPolicy: 'all',
  });
}

// Hook for getting sessions
export function useSessions(participantId: string) {
  return useQuery(GET_SESSIONS, {
    variables: { participantId },
    skip: !participantId,
    errorPolicy: 'all',
  });
}

