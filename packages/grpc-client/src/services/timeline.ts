// Merkle DAG: grpc.client.services.timeline
// Timeline service client

import { createClient } from "@connectrpc/connect";
import { createGrpcTransport } from "../client";
import { TimelineService } from "../generated/timeline_connect";
import {
  GetTimelineRequest,
  type GetTimelineResponse,
  GetWordAggregatesRequest,
  type GetWordAggregatesResponse,
  GetEmotionVectorsRequest,
  type GetEmotionVectorsResponse,
  GetWordStatisticsRequest,
  type GetWordStatisticsResponse,
} from "../generated/timeline_pb";

// Re-export types for hooks
export type {
  GetTimelineResponse,
  GetWordAggregatesResponse,
  GetEmotionVectorsResponse,
  GetWordStatisticsResponse,
} from "../generated/timeline_pb";

// Create client instance
let clientInstance: any = null;

function getClient() {
  if (!clientInstance) {
    const transport = createGrpcTransport();
    clientInstance = createClient(TimelineService as any, transport);
  }
  return clientInstance;
}

export async function getTimeline(params: {
  participantId: string;
  sessionId?: string;
  startTime?: string;
  endTime?: string;
  interval?: string;
}): Promise<GetTimelineResponse> {
  const client = getClient();
  const request = new GetTimelineRequest({
    participantId: params.participantId,
    ...(params.sessionId !== undefined && { sessionId: params.sessionId }),
    ...(params.startTime !== undefined && { startTime: params.startTime }),
    ...(params.endTime !== undefined && { endTime: params.endTime }),
    ...(params.interval !== undefined && { interval: params.interval }),
  });
  return await client.getTimeline(request) as GetTimelineResponse;
}

export async function getWordAggregates(params: {
  participantId: string;
  sessionId?: string;
}): Promise<GetWordAggregatesResponse> {
  const client = getClient();
  const request = new GetWordAggregatesRequest({
    participantId: params.participantId,
    ...(params.sessionId !== undefined && { sessionId: params.sessionId }),
  });
  return await client.getWordAggregates(request) as GetWordAggregatesResponse;
}

export async function getEmotionVectors(params: {
  participantId: string;
  sessionId?: string;
}): Promise<GetEmotionVectorsResponse> {
  const client = getClient();
  const request = new GetEmotionVectorsRequest({
    participantId: params.participantId,
    ...(params.sessionId !== undefined && { sessionId: params.sessionId }),
  });
  return await client.getEmotionVectors(request) as GetEmotionVectorsResponse;
}

export async function getWordStatistics(params: {
  participantId: string;
  sessionId?: string;
}): Promise<GetWordStatisticsResponse> {
  const client = getClient();
  const request = new GetWordStatisticsRequest({
    participantId: params.participantId,
    ...(params.sessionId !== undefined && { sessionId: params.sessionId }),
  });
  return await client.getWordStatistics(request) as GetWordStatisticsResponse;
}
