// Merkle DAG: graphql.client
// GraphQL client for connecting to GraphQL service
// Uses generated types from GraphQL Code Generator

import { GraphQLClient } from 'graphql-request';
import {
  GetParticipantsDocument,
  GetParticipantDocument,
  GetSessionsDocument,
  GetTimelineDocument,
  GetWordAggregatesDocument,
  GetEmotionVectorsDocument,
  GetWordStatisticsDocument,
  type GetParticipantsQueryResult,
  type GetParticipantQueryResult,
  type GetSessionsQueryResult,
  type GetTimelineQueryResult,
  type GetWordAggregatesQueryResult,
  type GetEmotionVectorsQueryResult,
  type GetWordStatisticsQueryResult,
  type GetParticipantsQueryVariables,
  type GetParticipantQueryVariables,
  type GetSessionsQueryVariables,
  type GetTimelineQueryVariables,
  type GetWordAggregatesQueryVariables,
  type GetEmotionVectorsQueryVariables,
  type GetWordStatisticsQueryVariables,
} from '@/generated/graphql';

const GRAPHQL_API_URL = process.env.GRAPHQL_API_URL || process.env.NEXT_PUBLIC_GRAPHQL_API_URL || 'http://localhost:8081/graphql';

export const graphqlClient = new GraphQLClient(GRAPHQL_API_URL, {
  headers: {
    'Content-Type': 'application/json',
  },
});

// Re-export generated queries and types for convenience
export {
  GetParticipantsDocument,
  GetParticipantDocument,
  GetSessionsDocument,
  GetTimelineDocument,
  GetWordAggregatesDocument,
  GetEmotionVectorsDocument,
  GetWordStatisticsDocument,
  type GetParticipantsQueryResult,
  type GetParticipantQueryResult,
  type GetSessionsQueryResult,
  type GetTimelineQueryResult,
  type GetWordAggregatesQueryResult,
  type GetEmotionVectorsQueryResult,
  type GetWordStatisticsQueryResult,
  type GetParticipantsQueryVariables,
  type GetParticipantQueryVariables,
  type GetSessionsQueryVariables,
  type GetTimelineQueryVariables,
  type GetWordAggregatesQueryVariables,
  type GetEmotionVectorsQueryVariables,
  type GetWordStatisticsQueryVariables,
};

// Legacy exports for backward compatibility (deprecated - use generated types)
export const GET_PARTICIPANTS = GetParticipantsDocument;
export const GET_PARTICIPANT = GetParticipantDocument;
export const GET_SESSIONS = GetSessionsDocument;
export const GET_TIMELINE = GetTimelineDocument;
export const GET_WORD_AGGREGATES = GetWordAggregatesDocument;
export const GET_EMOTION_VECTORS = GetEmotionVectorsDocument;
export const GET_WORD_STATISTICS = GetWordStatisticsDocument;

