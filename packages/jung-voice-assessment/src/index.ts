// Merkle DAG: jung-voice-assessment.package
// Common Jung Voice Assessment components package

export { default as JungVoiceTest } from './JungVoiceTest';
export { default as AudioVisualizer } from './AudioVisualizer';
export { useKawasakiStore } from './store';
export type { KawasakiStore, KawasakiStoreState, KawasakiStoreActions, Word, WordResponse, TestResult, MediaStatus, JungVoiceTestProps } from './types';
export { useStimulusWords } from './hooks/useStimulusWords';

// Export types from types.ts
export type {
  Word,
  WordResponse as WordResponseType,
  TestResult,
  MediaStatus,
  KawasakiStoreState,
  KawasakiStoreActions,
  KawasakiStore,
  JungVoiceTestProps,
} from './types';

// Re-export WordResponse from types.ts with original name for backward compatibility
export type { WordResponse as WordResponseFromTypes } from './types';

export type { WordResponseWithExtras } from './WordResponse';

// Export schemas
export {
  ParticipantSchema,
  WordResponseSchema,
  WordStimulusSchema,
  ResponseDataSchema,
  ConsentDataSchema,
  SaveStructuredDataPayloadSchema,
} from './schema';

// Export types from schema.ts (WordResponse from schema is the zod-inferred type)
export type {
  Participant,
  WordStimulus,
  WordResponse,
  ResponseData,
  ConsentData,
  SaveStructuredDataPayload,
} from './schema';

// Export constants
export { JUNG_TEST_WELCOME_MESSAGE } from './constants';

// Export utilities
export {
  getAudioFromCache,
  saveAudioToCache,
  clearAudioCache,
  getAudioCacheSize,
} from './utils/audioCache';

