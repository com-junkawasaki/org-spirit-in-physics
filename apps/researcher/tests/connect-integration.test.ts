/**
 * Integration tests for Connect RPC client
 * Tests frontend connection to Go gRPC backend
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { serverParticipantClient, serverSessionClient, serverTimelineClient } from '../src/lib/connect/server-client';
import type { GetParticipantsRequest } from '../src/generated/proto/participant/v1/participant';
import type { GetSessionsRequest } from '../src/generated/proto/session/v1/session';
import type { GetTimelineRequest } from '../src/generated/proto/timeline/v1/timeline';

describe('Connect RPC Integration Tests', () => {
  const GRPC_API_URL = process.env.GRPC_API_URL || 'http://localhost:8080';
  const TEST_PARTICIPANT_ID = process.env.TEST_PARTICIPANT_ID || '25111604-c7db-4bfd-8662-e55060e332d6';

  beforeAll(() => {
    // Set environment variable if not set
    if (!process.env.GRPC_API_URL) {
      process.env.GRPC_API_URL = GRPC_API_URL;
    }
  });

  describe('Participant Service', () => {
    it('should fetch participants', async () => {
      const request: GetParticipantsRequest = {};
      const response = await serverParticipantClient.getParticipants(request);
      
      expect(response).toBeDefined();
      expect(response.participants).toBeDefined();
      expect(Array.isArray(response.participants)).toBe(true);
    });
  });

  describe('Session Service', () => {
    it('should fetch sessions for a participant', async () => {
      const request: GetSessionsRequest = {
        participantId: TEST_PARTICIPANT_ID,
      };
      
      const response = await serverSessionClient.getSessions(request);
      
      expect(response).toBeDefined();
      expect(response.sessions).toBeDefined();
      expect(Array.isArray(response.sessions)).toBe(true);
    });
  });

  describe('Timeline Service', () => {
    it('should fetch timeline for a participant', async () => {
      const request: GetTimelineRequest = {
        participantId: TEST_PARTICIPANT_ID,
      };
      
      const response = await serverTimelineClient.getTimeline(request);
      
      expect(response).toBeDefined();
      expect(response.points).toBeDefined();
      expect(Array.isArray(response.points)).toBe(true);
    });

    it('should fetch word aggregates', async () => {
      const request = {
        participantId: TEST_PARTICIPANT_ID,
      };
      
      const response = await serverTimelineClient.getWordAggregates(request);
      
      expect(response).toBeDefined();
      expect(response.aggregates).toBeDefined();
      expect(Array.isArray(response.aggregates)).toBe(true);
    });

    it('should fetch emotion vectors', async () => {
      const request = {
        participantId: TEST_PARTICIPANT_ID,
      };
      
      const response = await serverTimelineClient.getEmotionVectors(request);
      
      expect(response).toBeDefined();
      expect(response.vectors).toBeDefined();
      expect(Array.isArray(response.vectors)).toBe(true);
    });

    it('should fetch word statistics', async () => {
      const request = {
        participantId: TEST_PARTICIPANT_ID,
      };
      
      const response = await serverTimelineClient.getWordStatistics(request);
      
      expect(response).toBeDefined();
      expect(response.statistics).toBeDefined();
      expect(Array.isArray(response.statistics)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid participant ID gracefully', async () => {
      const request: GetTimelineRequest = {
        participantId: 'invalid-id',
      };
      
      await expect(
        serverTimelineClient.getTimeline(request)
      ).rejects.toThrow();
    });
  });
});
