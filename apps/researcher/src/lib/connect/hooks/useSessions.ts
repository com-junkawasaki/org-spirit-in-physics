// Merkle DAG: connect.hooks.useSessions
// React hook for fetching sessions using Connect RPC

import { useQuery } from '@tanstack/react-query';
import { sessionClient } from '../client';
import type { GetSessionsRequest } from '@spirit-in-physics/services/grpc/gen/proto/session/v1/session';

export function useSessions(participantId: string) {
  return useQuery({
    queryKey: ['sessions', participantId],
    queryFn: async () => {
      const response = await sessionClient.getSessions({
        participantId,
      });
      return response.sessions;
    },
    enabled: !!participantId,
  });
}
