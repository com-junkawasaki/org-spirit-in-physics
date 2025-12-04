// Merkle DAG: grpc.client.services.sessions
// Session service client

import { createClient } from "@connectrpc/connect";
import { createGrpcTransport } from "../client.js";
import { SessionService } from "../generated/sessions_pb.js";
import {
  GetSessionsRequestSchema,
  type GetSessionsResponse,
  CreateSessionRequestSchema,
  type CreateSessionResponse,
} from "../generated/sessions_pb.js";

// Re-export types for hooks
export type { GetSessionsResponse, CreateSessionResponse } from "../generated/sessions_pb.js";
import { JsonValueSchema } from "../generated/common_pb.js";
import { create } from "@bufbuild/protobuf";

// Create client instance
let clientInstance: any = null;

function getClient() {
  if (!clientInstance) {
    const transport = createGrpcTransport();
    clientInstance = createClient(SessionService as any, transport);
  }
  return clientInstance;
}

export async function getSessions(participantId: string): Promise<GetSessionsResponse> {
  const client = getClient();
  const request = create(GetSessionsRequestSchema, { participantId });
  return await client.getSessions(request);
}

export async function createSession(data: {
  participantId: string;
  sessionIndex?: number;
  startTs: number;
  events: any[]; // JSON array
}): Promise<CreateSessionResponse> {
  const client = getClient();
  const eventsJson = create(JsonValueSchema, { value: JSON.stringify(data.events) });
  const request = create(CreateSessionRequestSchema, {
    participantId: data.participantId,
    ...(data.sessionIndex !== undefined && { sessionIndex: data.sessionIndex }),
    startTs: BigInt(data.startTs),
    events: eventsJson,
  });
  return await client.createSession(request) as CreateSessionResponse;
}
