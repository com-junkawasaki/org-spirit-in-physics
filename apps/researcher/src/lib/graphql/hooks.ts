//! GraphQL React Hooks (Type-Safe)
//! 
//! Merkle DAG: graphql.hooks
//! OWL: spirit:GraphQL Service Port React hooks
//! 
//! Note: This file provides convenience hooks. Generated hooks are available from generated/types.ts

import { useQuery, useMutation, QueryHookOptions, MutationHookOptions } from '@apollo/client';
import { GET_PARTICIPANTS, GET_PARTICIPANT } from './queries/participants';
import { GET_SESSIONS, GET_SESSIONS_BY_PARTICIPANT } from './queries/sessions';
import { GET_ANALYSIS_RESULTS } from './queries/analysis';
import { GET_CONSENT } from './queries/consent';
import { GET_EMOTION_RESULTS, GET_EMOTION_STATISTICS } from './queries/emotions';
import { GET_SESSION_EVENTS } from './queries/session_events';
import { EXECUTE_ACTIVITY } from './mutations/activities';
import { ANALYZE_PARTICIPANT } from './mutations/analyzer';
import type {
  GetParticipantsQuery,
  GetParticipantQuery,
  GetSessionsQuery,
  GetAnalysisResultsQuery,
  ExecuteActivityMutation,
  ExecuteActivityMutationVariables,
} from './generated/types';

// Re-export generated types for convenience
export type {
  GetParticipantsQuery,
  GetParticipantQuery,
  GetSessionsQuery,
  GetAnalysisResultsQuery,
  ExecuteActivityMutation,
  Participant,
  Session,
  AnalysisResult,
  ActivityExecutionResponse,
} from './generated/types';

// Query hooks with generated types
export function useParticipants(
  options?: QueryHookOptions<GetParticipantsQuery>
) {
  return useQuery<GetParticipantsQuery>(GET_PARTICIPANTS, options);
}

export function useParticipant(
  id: string,
  options?: QueryHookOptions<GetParticipantQuery, { id: string }>
) {
  return useQuery<GetParticipantQuery, { id: string }>(GET_PARTICIPANT, {
    ...options,
    variables: { id },
    skip: !id,
  });
}

export function useSessionsByParticipant(
  participantId: string,
  options?: QueryHookOptions<any, { participantId: string }>
) {
  return useQuery<any, { participantId: string }>(GET_SESSIONS_BY_PARTICIPANT, {
    ...options,
    variables: { participantId },
    skip: !participantId,
  });
}

export function useSessions(
  participantId?: string,
  options?: QueryHookOptions<GetSessionsQuery, { participantId?: string }>
) {
  return useQuery<GetSessionsQuery, { participantId?: string }>(GET_SESSIONS, {
    ...options,
    variables: { participantId: participantId || undefined },
  });
}

export function useAnalysisResults(
  participantId?: string,
  experimentId?: string,
  options?: QueryHookOptions<
    GetAnalysisResultsQuery,
    { participantId?: string; experimentId?: string }
  >
) {
  return useQuery<
    GetAnalysisResultsQuery,
    { participantId?: string; experimentId?: string }
  >(GET_ANALYSIS_RESULTS, {
    ...options,
    variables: { participantId, experimentId },
  });
}

// Mutation hooks with generated types
export function useExecuteActivity(
  options?: MutationHookOptions<ExecuteActivityMutation, ExecuteActivityMutationVariables>
) {
  return useMutation<ExecuteActivityMutation, ExecuteActivityMutationVariables>(
    EXECUTE_ACTIVITY,
    options
  );
}

export function useAnalyzeParticipant() {
  return useMutation(ANALYZE_PARTICIPANT);
}

// Consent hooks
export function useConsent(
  participantId: string,
  options?: QueryHookOptions<any, { participantId: string }>
) {
  return useQuery<any, { participantId: string }>(GET_CONSENT, {
    ...options,
    variables: { participantId },
    skip: !participantId,
  });
}

// Session events hooks
export function useSessionEvents(
  participantId: string,
  sessionId: string,
  options?: QueryHookOptions<any, { participantId: string; sessionId: string }>
) {
  return useQuery<any, { participantId: string; sessionId: string }>(GET_SESSION_EVENTS, {
    ...options,
    variables: { participantId, sessionId },
    skip: !participantId || !sessionId,
  });
}

// Emotion hooks
export function useEmotionResults(
  participantId: string,
  options?: QueryHookOptions<any, { participantId: string }>
) {
  return useQuery<any, { participantId: string }>(GET_EMOTION_RESULTS, {
    ...options,
    variables: { participantId },
    skip: !participantId,
  });
}

export function useEmotionStatistics(
  options?: QueryHookOptions<any>
) {
  return useQuery<any>(GET_EMOTION_STATISTICS, options);
}

