// Merkle DAG: grpc.client.services.timeline
// Timeline service client

import { createPromiseClient } from "@connectrpc/connect";
import { createGrpcTransport } from "../client.js";
import { TimelineService } from "../generated/timeline_connect.js";
import type { TimelineService as TimelineServiceType } from "../generated/timeline_pb.js";
import {
  GetTimelineRequestSchema,
  GetTimelineResponse,
  GetWordAggregatesRequestSchema,
  GetWordAggregatesResponse,
  GetEmotionVectorsRequestSchema,
  GetEmotionVectorsResponse,
  GetWordStatisticsRequestSchema,
  GetWordStatisticsResponse,
} from "../generated/timeline_pb.js";
import { create } from "@bufbuild/protobuf";

// Create client instance
let clientInstance: ReturnType<typeof createPromiseClient<TimelineServiceType>> | null = null;

function getClient() {
  if (!clientInstance) {
    const transport = createGrpcTransport();
    clientInstance = createPromiseClient(TimelineService, transport);
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
  const request = create(GetTimelineRequestSchema, {
    participantId: params.participantId,
    sessionId: params.sessionId,
    startTime: params.startTime,
    endTime: params.endTime,
    interval: params.interval,
  });
  return await client.getTimeline(request);
}

export async function getWordAggregates(params: {
  participantId: string;
  sessionId?: string;
}): Promise<GetWordAggregatesResponse> {
  const client = getClient();
  const request = create(GetWordAggregatesRequestSchema, {
    participantId: params.participantId,
    sessionId: params.sessionId,
  });
  return await client.getWordAggregates(request);
}

export async function getEmotionVectors(params: {
  participantId: string;
  sessionId?: string;
}): Promise<GetEmotionVectorsResponse> {
  const client = getClient();
  const request = create(GetEmotionVectorsRequestSchema, {
    participantId: params.participantId,
    sessionId: params.sessionId,
  });
  return await client.getEmotionVectors(request);
}

export async function getWordStatistics(params: {
  participantId: string;
  sessionId?: string;
}): Promise<GetWordStatisticsResponse> {
  const client = getClient();
  const request = create(GetWordStatisticsRequestSchema, {
    participantId: params.participantId,
    sessionId: params.sessionId,
  });
  return await client.getWordStatistics(request);
}
