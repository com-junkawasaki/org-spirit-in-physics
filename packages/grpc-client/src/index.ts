// Merkle DAG: grpc.client.index
// gRPC client library exports

export * from "./client";
export * from "./services/participants";
export * from "./services/sessions";
export * from "./services/timeline";
export * from "./services/stimulus_words";
export * from "./hooks";

// Re-export types for convenience
export type {
  GetParticipantsResponse,
  GetParticipantResponse,
  CreateParticipantResponse,
} from "./generated/participants_pb.js";
export type {
  GetSessionsResponse,
  CreateSessionResponse,
} from "./generated/sessions_pb.js";
export type {
  GetTimelineResponse,
  GetWordAggregatesResponse,
  GetEmotionVectorsResponse,
  GetWordStatisticsResponse,
} from "./generated/timeline_pb.js";
export type {
  GetStimulusWordsResponse,
  GetStimulusWordResponse,
} from "./generated/stimulus_words_pb.js";

