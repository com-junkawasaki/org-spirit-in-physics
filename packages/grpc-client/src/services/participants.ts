// Merkle DAG: grpc.client.services.participants
// Participant service client

import { createPromiseClient } from "@connectrpc/connect";
import { createGrpcTransport } from "../client.js";
import { ParticipantService } from "../generated/participants_connect.js";
import type { ParticipantService as ParticipantServiceType } from "../generated/participants_pb.js";
import {
  GetParticipantsRequest,
  GetParticipantsResponse,
  GetParticipantRequest,
  GetParticipantResponse,
  CreateParticipantRequest,
  CreateParticipantResponse,
  GetParticipantsRequestSchema,
  GetParticipantRequestSchema,
  CreateParticipantRequestSchema,
} from "../generated/participants_pb.js";
import { JsonValueSchema } from "../generated/common_pb.js";
import { create } from "@bufbuild/protobuf";

// Create client instance
let clientInstance: ReturnType<typeof createPromiseClient<ParticipantServiceType>> | null = null;

function getClient() {
  if (!clientInstance) {
    const transport = createGrpcTransport();
    clientInstance = createPromiseClient(ParticipantService, transport);
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
    id: data.id,
    signature: data.signature,
    agreements,
    agreedAt: data.agreedAt,
    isPublic: data.isPublic,
  });
  return await client.createParticipant(request);
}
