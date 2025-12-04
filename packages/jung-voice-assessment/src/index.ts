// Merkle DAG: jung-voice-assessment.package
// Common Jung Voice Assessment components package

export { default as JungVoiceTest } from './JungVoiceTest';
export { default as AudioVisualizer } from './AudioVisualizer';
export { useKawasakiStore } from './store';
export { useStimulusWords } from './hooks/useStimulusWords';

// Export types
export type {
  Word,
  WordResponse as WordResponseType,
  TestResult,
  MediaStatus,
  KawasakiStoreState,
  KawasakiStoreActions,
  KawasakiStore,
  GraphQLMutations,
  GraphQLCallbacks,
  JungVoiceTestProps,
} from './types';

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

