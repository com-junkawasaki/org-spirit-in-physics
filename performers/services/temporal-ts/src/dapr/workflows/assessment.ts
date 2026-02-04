/**
 * Jung Voice Assessment Workflow using Dapr State Store
 *
 * In Temporal, this workflow used signals/queries for real-time updates.
 * In Dapr, we use state store for persistence and pub/sub for events.
 */

import { DaprClient } from '@dapr/dapr';
import {
  AssessmentState,
  ParticipantDemographics,
  WordResponse
} from '../../types';

const STATESTORE_NAME = 'statestore';
const PUBSUB_NAME = 'pubsub';

// Event types that map to Temporal signals
export type AssessmentEventType =
  | 'updateConsent'
  | 'startSession'
  | 'recordWordResponse'
  | 'updateArtifact'
  | 'completeAssessment';

export interface AssessmentEvent {
  type: AssessmentEventType;
  payload: any;
}

/**
 * Get assessment state key
 */
function getStateKey(participantId: string): string {
  return `assessment:${participantId}`;
}

/**
 * Initialize a new assessment
 */
export async function initializeAssessment(
  daprClient: DaprClient,
  participantId: string,
  email: string,
  mode: string = 'full'
): Promise<AssessmentState> {
  const state: AssessmentState = {
    participantId,
    email,
    status: 'idle',
    demographics: {
      ageGroup: '',
      gender: '',
      ethnicity: '',
      incomeRange: '',
      medicalHistory: []
    },
    responses: [],
    artifacts: []
  };

  // Save initial state
  await daprClient.state.save(STATESTORE_NAME, [
    { key: getStateKey(participantId), value: state }
  ]);

  return state;
}

/**
 * Get current assessment state (equivalent to Temporal query)
 */
export async function getAssessmentState(
  daprClient: DaprClient,
  participantId: string
): Promise<AssessmentState | null> {
  const result = await daprClient.state.get(STATESTORE_NAME, getStateKey(participantId));
  return result as AssessmentState | null;
}

/**
 * Handle assessment events (equivalent to Temporal signals)
 */
export async function handleAssessmentEvent(
  daprClient: DaprClient,
  participantId: string,
  event: AssessmentEvent
): Promise<AssessmentState | null> {
  const state = await getAssessmentState(daprClient, participantId);
  if (!state) {
    console.error(`Assessment not found for participant: ${participantId}`);
    return null;
  }

  switch (event.type) {
    case 'updateConsent':
      state.demographics = event.payload as ParticipantDemographics;
      if (state.status === 'idle') {
        state.status = 'preflight';
      }
      break;

    case 'startSession':
      const sessionNumber = event.payload as number;
      state.status = sessionNumber === 1 ? 'session-1-running' : 'session-2-running';
      break;

    case 'recordWordResponse':
      state.responses.push(event.payload as WordResponse);
      break;

    case 'updateArtifact':
      state.artifacts.push(event.payload as {
        type: 'video' | 'image' | 'audio';
        url: string;
        session: number;
      });
      break;

    case 'completeAssessment':
      state.status = 'completed';
      break;

    default:
      console.warn(`Unknown event type: ${event.type}`);
  }

  // Save updated state
  await daprClient.state.save(STATESTORE_NAME, [
    { key: getStateKey(participantId), value: state }
  ]);

  // Publish state update event
  await daprClient.pubsub.publish(PUBSUB_NAME, 'assessment-state-updated', {
    participantId,
    status: state.status,
    eventType: event.type
  });

  return state;
}

/**
 * Update consent (signal handler)
 */
export async function updateConsent(
  daprClient: DaprClient,
  participantId: string,
  demographics: ParticipantDemographics
): Promise<AssessmentState | null> {
  return handleAssessmentEvent(daprClient, participantId, {
    type: 'updateConsent',
    payload: demographics
  });
}

/**
 * Start session (signal handler)
 */
export async function startSession(
  daprClient: DaprClient,
  participantId: string,
  sessionNumber: number
): Promise<AssessmentState | null> {
  return handleAssessmentEvent(daprClient, participantId, {
    type: 'startSession',
    payload: sessionNumber
  });
}

/**
 * Record word response (signal handler)
 */
export async function recordWordResponse(
  daprClient: DaprClient,
  participantId: string,
  response: WordResponse
): Promise<AssessmentState | null> {
  return handleAssessmentEvent(daprClient, participantId, {
    type: 'recordWordResponse',
    payload: response
  });
}

/**
 * Update artifact (signal handler)
 */
export async function updateArtifact(
  daprClient: DaprClient,
  participantId: string,
  artifact: { type: string; url: string; session: number }
): Promise<AssessmentState | null> {
  return handleAssessmentEvent(daprClient, participantId, {
    type: 'updateArtifact',
    payload: artifact
  });
}

/**
 * Complete assessment (signal handler)
 */
export async function completeAssessment(
  daprClient: DaprClient,
  participantId: string
): Promise<AssessmentState | null> {
  return handleAssessmentEvent(daprClient, participantId, {
    type: 'completeAssessment',
    payload: null
  });
}

/**
 * Delete assessment state (cleanup)
 */
export async function deleteAssessment(
  daprClient: DaprClient,
  participantId: string
): Promise<void> {
  await daprClient.state.delete(STATESTORE_NAME, getStateKey(participantId));
}
