'use client';

//! GraphQL React Hooks (Type-Safe)
//! 
//! Merkle DAG: graphql.hooks.participant
//! OWL: spirit:GraphQL Service Port React hooks

import * as Apollo from '@apollo/client';
import { GET_PARTICIPANTS, GET_PARTICIPANT } from './queries/participants';
import { GET_CONSENT } from './queries/consent';
import { GET_SESSIONS, GET_SESSIONS_BY_PARTICIPANT, GET_SESSION_EVENTS } from './queries/sessions';
import { GET_EMOTION_RESULTS, GET_EMOTION_STATISTICS } from './queries/emotions';
import { CREATE_PARTICIPANT, SAVE_CONSENT } from './mutations/participants';
import { SAVE_SESSION } from './mutations/sessions';
import { SAVE_VIDEO } from './mutations/artifacts';
import { ANALYZE_PARTICIPANT, ANALYZE_ALL_PARTICIPANTS } from './mutations/analysis';
import { ANALYZE_VIDEO_EMOTIONS } from './mutations/emotions';
import type {
  GetParticipantsQuery,
  GetParticipantsQueryVariables,
  GetParticipantQuery,
  GetParticipantQueryVariables,
  GetConsentQuery,
  GetConsentQueryVariables,
  GetSessionsQuery,
  GetSessionsQueryVariables,
  GetSessionsByParticipantQuery,
  GetSessionsByParticipantQueryVariables,
  GetSessionEventsQuery,
  GetSessionEventsQueryVariables,
  GetEmotionResultsQuery,
  GetEmotionResultsQueryVariables,
  GetEmotionStatisticsQuery,
  GetEmotionStatisticsQueryVariables,
  CreateParticipantMutation,
  CreateParticipantMutationVariables,
  SaveConsentMutation,
  SaveConsentMutationVariables,
  SaveSessionMutation,
  SaveSessionMutationVariables,
  SaveVideoMutation,
  SaveVideoMutationVariables,
  AnalyzeParticipantMutation,
  AnalyzeParticipantMutationVariables,
  AnalyzeAllParticipantsMutation,
  AnalyzeAllParticipantsMutationVariables,
  AnalyzeVideoEmotionsMutation,
  AnalyzeVideoEmotionsMutationVariables,
} from './generated/types';

// Query hooks
export function useParticipants(
  options?: Apollo.QueryHookOptions<GetParticipantsQuery, GetParticipantsQueryVariables>
) {
  return Apollo.useQuery<GetParticipantsQuery, GetParticipantsQueryVariables>(GET_PARTICIPANTS, options);
}

export function useParticipant(
  id: string,
  options?: Apollo.QueryHookOptions<GetParticipantQuery, GetParticipantQueryVariables>
) {
  return Apollo.useQuery<GetParticipantQuery, GetParticipantQueryVariables>(GET_PARTICIPANT, {
    ...options,
    variables: { id },
    skip: !id,
  });
}

export function useConsent(
  participantId: string,
  options?: Apollo.QueryHookOptions<GetConsentQuery, GetConsentQueryVariables>
) {
  return Apollo.useQuery<GetConsentQuery, GetConsentQueryVariables>(GET_CONSENT, {
    ...options,
    variables: { participantId },
    skip: !participantId,
  });
}

export function useSessions(
  participantId?: string,
  options?: Apollo.QueryHookOptions<GetSessionsQuery, GetSessionsQueryVariables>
) {
  return Apollo.useQuery<GetSessionsQuery, GetSessionsQueryVariables>(GET_SESSIONS, {
    ...options,
    variables: { participantId: participantId || undefined },
  });
}

export function useSessionsByParticipant(
  participantId: string,
  options?: Apollo.QueryHookOptions<GetSessionsByParticipantQuery, GetSessionsByParticipantQueryVariables>
) {
  return Apollo.useQuery<GetSessionsByParticipantQuery, GetSessionsByParticipantQueryVariables>(GET_SESSIONS_BY_PARTICIPANT, {
    ...options,
    variables: { participantId },
    skip: !participantId,
  });
}

export function useSessionEvents(
  participantId: string,
  sessionId: string,
  options?: Apollo.QueryHookOptions<GetSessionEventsQuery, GetSessionEventsQueryVariables>
) {
  return Apollo.useQuery<GetSessionEventsQuery, GetSessionEventsQueryVariables>(GET_SESSION_EVENTS, {
    ...options,
    variables: { participantId, sessionId },
    skip: !participantId || !sessionId,
  });
}

export function useEmotionResults(
  participantId: string,
  options?: Apollo.QueryHookOptions<GetEmotionResultsQuery, GetEmotionResultsQueryVariables>
) {
  return Apollo.useQuery<GetEmotionResultsQuery, GetEmotionResultsQueryVariables>(GET_EMOTION_RESULTS, {
    ...options,
    variables: { participantId },
    skip: !participantId,
  });
}

export function useEmotionStatistics(
  options?: Apollo.QueryHookOptions<GetEmotionStatisticsQuery, GetEmotionStatisticsQueryVariables>
) {
  return Apollo.useQuery<GetEmotionStatisticsQuery, GetEmotionStatisticsQueryVariables>(GET_EMOTION_STATISTICS, options);
}

// Mutation hooks
export function useCreateParticipant(
  options?: Apollo.MutationHookOptions<CreateParticipantMutation, CreateParticipantMutationVariables>
) {
  return Apollo.useMutation<CreateParticipantMutation, CreateParticipantMutationVariables>(CREATE_PARTICIPANT, options);
}

export function useSaveConsent(
  options?: Apollo.MutationHookOptions<SaveConsentMutation, SaveConsentMutationVariables>
) {
  return Apollo.useMutation<SaveConsentMutation, SaveConsentMutationVariables>(SAVE_CONSENT, options);
}

export function useSaveSession(
  options?: Apollo.MutationHookOptions<SaveSessionMutation, SaveSessionMutationVariables>
) {
  return Apollo.useMutation<SaveSessionMutation, SaveSessionMutationVariables>(SAVE_SESSION, options);
}

export function useSaveVideo(
  options?: Apollo.MutationHookOptions<SaveVideoMutation, SaveVideoMutationVariables>
) {
  return Apollo.useMutation<SaveVideoMutation, SaveVideoMutationVariables>(SAVE_VIDEO, options);
}

export function useAnalyzeParticipant(
  options?: Apollo.MutationHookOptions<AnalyzeParticipantMutation, AnalyzeParticipantMutationVariables>
) {
  return Apollo.useMutation<AnalyzeParticipantMutation, AnalyzeParticipantMutationVariables>(ANALYZE_PARTICIPANT, options);
}

export function useAnalyzeAllParticipants(
  options?: Apollo.MutationHookOptions<AnalyzeAllParticipantsMutation, AnalyzeAllParticipantsMutationVariables>
) {
  return Apollo.useMutation<AnalyzeAllParticipantsMutation, AnalyzeAllParticipantsMutationVariables>(ANALYZE_ALL_PARTICIPANTS, options);
}

export function useAnalyzeVideoEmotions(
  options?: Apollo.MutationHookOptions<AnalyzeVideoEmotionsMutation, AnalyzeVideoEmotionsMutationVariables>
) {
  return Apollo.useMutation<AnalyzeVideoEmotionsMutation, AnalyzeVideoEmotionsMutationVariables>(ANALYZE_VIDEO_EMOTIONS, options);
}

