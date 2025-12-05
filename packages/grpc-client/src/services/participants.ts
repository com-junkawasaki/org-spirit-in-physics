// Merkle DAG: grpc.client.services.participants
// Participant service client

import { createClient } from "@connectrpc/connect";
import { createGrpcTransport } from "../client";
import { ParticipantService } from "../generated/participants_connect";
import {
  type GetParticipantsResponse,
  type GetParticipantResponse,
  type CreateParticipantResponse,
  GetParticipantsRequest,
  GetParticipantRequest,
  CreateParticipantRequest,
} from "../generated/participants_pb";
import { JsonValue } from "../generated/common_pb";

// Re-export types for hooks
export type { GetParticipantsResponse, GetParticipantResponse, CreateParticipantResponse } from "../generated/participants_pb";

// Create client instance
let clientInstance: any = null;

function getClient() {
  if (!clientInstance) {
    const transport = createGrpcTransport();
    clientInstance = createClient(ParticipantService as any, transport);
  }
  return clientInstance;
}

export async function getParticipants(): Promise<GetParticipantsResponse> {
  const client = getClient();
  const request = new GetParticipantsRequest({});
  return await client.getParticipants(request);
}

export async function getParticipant(id: string): Promise<GetParticipantResponse> {
  const client = getClient();
  const request = new GetParticipantRequest({ id });
  return await client.getParticipant(request);
}

export async function createParticipant(data: {
  id?: string;
  signature: string;
  agreements: any;
  agreedAt: string;
  isPublic?: boolean;
}): Promise<CreateParticipantResponse> {
  const client = getClient();
  const agreements = new JsonValue({ value: JSON.stringify(data.agreements) });
  const request = new CreateParticipantRequest({
    ...(data.id !== undefined && { id: data.id }),
    signature: data.signature,
    agreements,
    agreedAt: data.agreedAt,
    ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
  });
  return await client.createParticipant(request);
}
