// Merkle DAG: grpc.client.index
// gRPC client library exports

export { getGrpcApiUrl, createGrpcTransport } from "./client";
export {
  getParticipants,
  getParticipant,
  createParticipant,
  type GetParticipantsResponse,
  type GetParticipantResponse,
  type CreateParticipantResponse,
} from "./services/participants";
export {
  getSessions,
  createSession,
  type GetSessionsResponse,
  type CreateSessionResponse,
} from "./services/sessions";
export {
  getTimeline,
  getWordAggregates,
  getEmotionVectors,
  getWordStatistics,
  type GetTimelineResponse,
  type GetWordAggregatesResponse,
  type GetEmotionVectorsResponse,
  type GetWordStatisticsResponse,
} from "./services/timeline";
export {
  getStimulusWords,
  getStimulusWord,
  type GetStimulusWordsResponse,
  type GetStimulusWordResponse,
} from "./services/stimulus_words";
export {
  useParticipants,
  useCreateParticipant,
  useParticipant,
} from "./hooks/useParticipants.js";
export {
  useSessions,
  useCreateSession,
} from "./hooks/useSessions.js";
export {
  useTimeline,
} from "./hooks/useTimeline.js";

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

