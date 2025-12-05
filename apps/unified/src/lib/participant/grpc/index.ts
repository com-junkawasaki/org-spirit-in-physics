/**
 * Merkle DAG: grpc.index
 * gRPC client exports for participant app
 */

export {
  getGrpcApiUrl,
  createGrpcTransport,
  getParticipants,
  getParticipant,
  createParticipant,
  getSessions,
  createSession,
  getTimeline,
  getWordAggregates,
  getEmotionVectors,
  getWordStatistics,
  getStimulusWords,
  getStimulusWord,
  useParticipants,
  useTimeline,
  type GetParticipantsResponse,
  type GetParticipantResponse,
  type CreateParticipantResponse,
  type GetSessionsResponse,
  type CreateSessionResponse,
  type GetTimelineResponse,
  type GetWordAggregatesResponse,
  type GetEmotionVectorsResponse,
  type GetWordStatisticsResponse,
  type GetStimulusWordsResponse,
  type GetStimulusWordResponse,
} from './client';
export { useParticipant, useSessions, useCreateParticipant, useCreateSession } from './hooks';

