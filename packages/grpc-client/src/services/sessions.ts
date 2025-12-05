// Merkle DAG: grpc.client.services.sessions
// Session service client

import { createClient } from "@connectrpc/connect";
import { createGrpcTransport } from "../client";
import { SessionService } from "../generated/sessions_connect";
import {
  GetSessionsRequest,
  type GetSessionsResponse,
  CreateSessionRequest,
  type CreateSessionResponse,
} from "../generated/sessions_pb";

// Re-export types for hooks
export type { GetSessionsResponse, CreateSessionResponse } from "../generated/sessions_pb";
import { JsonValue } from "../generated/common_pb";

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
  const request = new GetSessionsRequest({ participantId });
  return await client.getSessions(request);
}

export async function createSession(data: {
  participantId: string;
  sessionIndex?: number;
  startTs: number;
  events: any[]; // JSON array
}): Promise<CreateSessionResponse> {
  const client = getClient();
  const eventsJson = new JsonValue({ value: JSON.stringify(data.events) });
  const request = new CreateSessionRequest({
    participantId: data.participantId,
    ...(data.sessionIndex !== undefined && { sessionIndex: data.sessionIndex }),
    startTs: BigInt(data.startTs),
    events: eventsJson,
  });
  return await client.createSession(request) as CreateSessionResponse;
}
