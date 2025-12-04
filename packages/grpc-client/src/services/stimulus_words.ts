// Merkle DAG: grpc.client.services.stimulus_words
// StimulusWord service client

import { createClient } from "@connectrpc/connect";
import { createGrpcTransport } from "../client.js";
import { StimulusWordService } from "../generated/stimulus_words_pb.js";
import {
  GetStimulusWordsRequestSchema,
  type GetStimulusWordsResponse,
  GetStimulusWordRequestSchema,
  type GetStimulusWordResponse,
} from "../generated/stimulus_words_pb.js";
import { create } from "@bufbuild/protobuf";

// Create client instance
let clientInstance: any = null;

function getClient() {
  if (!clientInstance) {
    const transport = createGrpcTransport();
    clientInstance = createClient(StimulusWordService as any, transport);
  }
  return clientInstance;
}

export async function getStimulusWords(): Promise<GetStimulusWordsResponse> {
  const client = getClient();
  const request = create(GetStimulusWordsRequestSchema, {});
  return await client.getStimulusWords(request) as GetStimulusWordsResponse;
}

export async function getStimulusWord(id: number): Promise<GetStimulusWordResponse> {
  const client = getClient();
  const request = create(GetStimulusWordRequestSchema, { id });
  return await client.getStimulusWord(request) as GetStimulusWordResponse;
}
