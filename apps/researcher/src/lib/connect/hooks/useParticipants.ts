// Merkle DAG: connect.hooks.useParticipants
// React hook for fetching participants using Connect RPC

import { useQuery } from '@tanstack/react-query';
import { participantClient } from '../client';
import type { GetParticipantsRequest } from '@spirit-in-physics/services/grpc/gen/proto/participant/v1/participant';

export function useParticipants(isPublic?: boolean) {
  return useQuery({
    queryKey: ['participants', isPublic],
    queryFn: async () => {
      const response = await participantClient.getParticipants({
        isPublic: isPublic !== undefined ? isPublic : undefined,
      });
      return response.participants;
    },
  });
}

export function useParticipant(id: string) {
  return useQuery({
    queryKey: ['participant', id],
    queryFn: async () => {
      const response = await participantClient.getParticipant({ id });
      return response.participant;
    },
    enabled: !!id,
  });
}
