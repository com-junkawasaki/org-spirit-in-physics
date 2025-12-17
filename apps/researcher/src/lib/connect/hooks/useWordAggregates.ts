// Merkle DAG: connect.hooks.useWordAggregates
// React hooks for fetching word aggregates using Connect RPC

import { useQuery } from '@tanstack/react-query';
import { timelineClient } from '../client';
import type { GetWordAggregatesRequest, GetEmotionVectorsRequest, GetWordStatisticsRequest } from '@/generated/proto/timeline/v1/timeline';

export function useWordAggregates(participantId: string, sessionId?: string) {
  return useQuery({
    queryKey: ['wordAggregates', participantId, sessionId],
    queryFn: async () => {
      const request: GetWordAggregatesRequest = {
        participantId,
        sessionId: sessionId || undefined,
      };
      const response = await timelineClient.getWordAggregates(request);
      return response.aggregates;
    },
    enabled: !!participantId,
  });
}

export function useEmotionVectors(participantId: string, sessionId?: string) {
  return useQuery({
    queryKey: ['emotionVectors', participantId, sessionId],
    queryFn: async () => {
      const request: GetEmotionVectorsRequest = {
        participantId,
        sessionId: sessionId || undefined,
      };
      const response = await timelineClient.getEmotionVectors(request);
      return response.vectors;
    },
    enabled: !!participantId,
  });
}

export function useWordStatistics(participantId: string, sessionId?: string) {
  return useQuery({
    queryKey: ['wordStatistics', participantId, sessionId],
    queryFn: async () => {
      const request: GetWordStatisticsRequest = {
        participantId,
        sessionId: sessionId || undefined,
      };
      const response = await timelineClient.getWordStatistics(request);
      return response.statistics;
    },
    enabled: !!participantId,
  });
}
