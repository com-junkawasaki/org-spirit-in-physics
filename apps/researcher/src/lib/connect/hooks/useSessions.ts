// Merkle DAG: connect.hooks.useSessions
// React hook for fetching sessions using Connect RPC

import { useQuery } from '@tanstack/react-query';
import { sessionClient } from '../client';
import type { GetSessionsRequest } from '@/generated/proto/session/v1/session';

export function useSessions(participantId: string) {
  return useQuery({
    queryKey: ['sessions', participantId],
    queryFn: async () => {
      const request: GetSessionsRequest = { participantId };
      const response = await sessionClient.getSessions(request);
      return response.sessions;
    },
    enabled: !!participantId,
  });
}
