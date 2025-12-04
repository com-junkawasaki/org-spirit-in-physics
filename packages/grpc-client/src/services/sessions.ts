// Merkle DAG: grpc.client.services.sessions
// Session service client

import { createPromiseClient } from "@connectrpc/connect";
import { createGrpcTransport } from "../client.js";
import { SessionService } from "../generated/sessions_connect.js";
import type { SessionService as SessionServiceType } from "../generated/sessions_pb.js";
import {
  GetSessionsRequestSchema,
  GetSessionsResponse,
  CreateSessionRequestSchema,
  CreateSessionResponse,
} from "../generated/sessions_pb.js";
import { JsonValueSchema } from "../generated/common_pb.js";
import { create } from "@bufbuild/protobuf";

// Create client instance
let clientInstance: ReturnType<typeof createPromiseClient<SessionServiceType>> | null = null;

function getClient() {
  if (!clientInstance) {
    const transport = createGrpcTransport();
    clientInstance = createPromiseClient(SessionService, transport);
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
    sessionIndex: data.sessionIndex,
    startTs: data.startTs,
    events: eventsJson,
  });
  return await client.createSession(request);
}
