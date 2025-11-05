//! GraphQL Type Definitions
//! 
//! Merkle DAG: graphql.types
//! OWL: spirit:GraphQL Service Port types

import { z } from 'zod';

/**
 * Participant GraphQL type
 */
export const ParticipantType = z.object({
  id: z.string().uuid(),
  age: z.number().nullable(),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).nullable(),
  handedness: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Session GraphQL type
 */
export const SessionType = z.object({
  id: z.string().uuid(),
  participantId: z.string().uuid(),
  sessionId: z.string().uuid(),
  sessionType: z.enum(['session-1', 'session-2']),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Word Response GraphQL type
 */
export const WordResponseType = z.object({
  id: z.string().uuid(),
  participantId: z.string().uuid(),
  experimentId: z.string().uuid(),
  wordStimulusId: z.number(),
  stimulusWord: z.string(),
  responseWord: z.string(),
  reactionTimeMs: z.number(),
  session: z.enum(['session-1', 'session-2']),
  timestamp: z.string().datetime(),
  audioFilePath: z.string().nullable(),
  videoFilePath: z.string().nullable(),
  skinPotential: z.number().nullable(),
  emotion: z.string().nullable(),
  emotionConfidence: z.number().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Analysis Result GraphQL type
 */
export const AnalysisResultType = z.object({
  id: z.string().uuid(),
  participantId: z.string().uuid(),
  experimentId: z.string().uuid(),
  wordStimulusId: z.number(),
  stimulusWord: z.string(),
  responseWord: z.string(),
  reactionTimeMs: z.number().nullable(),
  spiritProbability: z.number(),
  word2vecComponent: z.number().nullable(),
  reactionTimeComponent: z.number().nullable(),
  skinPotentialComponent: z.number().nullable(),
  emotionComponent: z.number().nullable(),
  emotionData: z.record(z.any()).nullable(),
  physiologicalData: z.record(z.any()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Activity Execution Request
 */
export const ActivityExecutionRequestType = z.object({
  activityId: z.string(),
  inputs: z.array(z.object({
    id: z.string(),
    type: z.string(),
    data: z.record(z.any()),
  })),
});

/**
 * Activity Execution Response
 */
export const ActivityExecutionResponseType = z.object({
  success: z.boolean(),
  result: z.object({
    activityId: z.string(),
    success: z.boolean(),
    outputs: z.array(z.object({
      id: z.string(),
      type: z.string(),
      data: z.record(z.any()),
    })),
    error: z.string().nullable(),
    executionTimeMs: z.number(),
    timestamp: z.string().datetime(),
  }).nullable(),
  error: z.string().nullable(),
});

