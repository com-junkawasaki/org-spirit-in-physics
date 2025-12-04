// Merkle DAG: grpc.client.services.stimulus_words
// StimulusWord service client

import { createPromiseClient } from "@connectrpc/connect";
import { createGrpcTransport } from "../client.js";
import { StimulusWordService } from "../generated/stimulus_words_connect.js";
import type { StimulusWordService as StimulusWordServiceType } from "../generated/stimulus_words_pb.js";
import {
  GetStimulusWordsRequestSchema,
  GetStimulusWordsResponse,
  GetStimulusWordRequestSchema,
  GetStimulusWordResponse,
} from "../generated/stimulus_words_pb.js";
import { create } from "@bufbuild/protobuf";

// Create client instance
let clientInstance: ReturnType<typeof createPromiseClient<StimulusWordServiceType>> | null = null;

function getClient() {
  if (!clientInstance) {
    const transport = createGrpcTransport();
    clientInstance = createPromiseClient(StimulusWordService, transport);
  }
  return clientInstance;
}

export async function getStimulusWords(): Promise<GetStimulusWordsResponse> {
  const client = getClient();
  const request = create(GetStimulusWordsRequestSchema, {});
  return await client.getStimulusWords(request);
}

export async function getStimulusWord(id: number): Promise<GetStimulusWordResponse> {
  const client = getClient();
  const request = create(GetStimulusWordRequestSchema, { id });
  return await client.getStimulusWord(request);
}
