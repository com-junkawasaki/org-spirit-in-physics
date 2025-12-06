// Export types
export type {
	TimelinePoint,
	EmotionData,
	PhysiologicalData,
	WordAggregate,
	EmotionVector,
	WordNode,
	WordLink
} from './types';

// Export components
export { default as Force3DWordGraphTypeGPU } from './Force3DWordGraphTypeGPU.svelte';
export { default as TimelineVisualization } from './TimelineVisualization.svelte';
export { default as Force3DWordGraph } from './Force3DWordGraph.svelte';

// Export utilities
export { normalizeEmotionName, EMOTION_KEYS, type EmotionKey } from './lib/emotion-normalization';
export { JUNG_STIMULUS_WORDS, type JungWord } from './constants/jung';
