// Merkle DAG: connect.hooks.useParticipants
// React hook for fetching participants using Connect RPC

import { useQuery } from '@tanstack/react-query';
import { participantClient } from '../client';
import type { GetParticipantsRequest, GetParticipantRequest } from '@/generated/proto/participant/v1/participant';

export function useParticipants(isPublic?: boolean) {
  return useQuery({
    queryKey: ['participants', isPublic],
    queryFn: async () => {
      const request: GetParticipantsRequest = {
        isPublic: isPublic !== undefined ? isPublic : undefined,
      };
      const response = await participantClient.getParticipants(request);
      return response.participants;
    },
  });
}

export function useParticipant(id: string) {
  return useQuery({
    queryKey: ['participant', id],
    queryFn: async () => {
      const request: GetParticipantRequest = { id };
      const response = await participantClient.getParticipant(request);
      return response.participant;
    },
    enabled: !!id,
  });
}
