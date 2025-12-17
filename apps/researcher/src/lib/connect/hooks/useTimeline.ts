// Merkle DAG: connect.hooks.useTimeline
// React hooks for fetching timeline data using Connect RPC

import { useQuery } from '@tanstack/react-query';
import { timelineClient } from '../client';
import type { GetTimelineRequest } from '@/generated/proto/timeline/v1/timeline';

export function useTimeline(
  participantId: string,
  sessionId?: string,
  startTime?: Date,
  endTime?: Date,
  interval?: string
) {
  return useQuery({
    queryKey: ['timeline', participantId, sessionId, startTime, endTime, interval],
    queryFn: async () => {
      const request: GetTimelineRequest = {
        participantId,
        sessionId: sessionId || undefined,
        startTime: startTime ? { seconds: Math.floor(startTime.getTime() / 1000), nanos: 0 } : undefined,
        endTime: endTime ? { seconds: Math.floor(endTime.getTime() / 1000), nanos: 0 } : undefined,
        interval: interval || undefined,
      };
      const response = await timelineClient.getTimeline(request);
      return response.points;
    },
    enabled: !!participantId,
  });
}
