// Merkle DAG: grpc.client.services.participants
// Participant service client

import { createClient } from "@connectrpc/connect";
import { createGrpcTransport } from "../client.js";
import { ParticipantService } from "../generated/participants_connect.js";
import {
  GetParticipantsResponse,
  GetParticipantResponse,
  CreateParticipantResponse,
  GetParticipantsRequestSchema,
  GetParticipantRequestSchema,
  CreateParticipantRequestSchema,
} from "../generated/participants_pb.js";
import { JsonValueSchema } from "../generated/common_pb.js";
import { create } from "@bufbuild/protobuf";

// Re-export types for hooks
export type { GetParticipantsResponse, GetParticipantResponse, CreateParticipantResponse } from "../generated/participants_pb.js";

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
  const request = create(GetParticipantsRequestSchema, {});
  return await client.getParticipants(request);
}

export async function getParticipant(id: string): Promise<GetParticipantResponse> {
  const client = getClient();
  const request = create(GetParticipantRequestSchema, { id });
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
  const agreements = create(JsonValueSchema, { value: JSON.stringify(data.agreements) });
  const request = create(CreateParticipantRequestSchema, {
    ...(data.id !== undefined && { id: data.id }),
    signature: data.signature,
    agreements,
    agreedAt: data.agreedAt,
    ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
  });
  return await client.createParticipant(request);
}
