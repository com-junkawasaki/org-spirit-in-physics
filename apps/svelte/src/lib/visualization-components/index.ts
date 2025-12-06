// Export all visualization components
export { default as KPICards } from './KPICards.svelte';
export { default as Force3DControls } from './Force3DControls.svelte';
export { default as TimelineChart } from './timeline/TimelineChart.svelte';
export { default as TimelineVisualization } from './TimelineVisualization.svelte';
export { default as Force3DWordGraph } from './Force3DWordGraph.svelte';
export { default as Force3DWordGraphTypeGPU } from './Force3DWordGraphTypeGPU.svelte';
export { default as StructureAnalysisPanel } from './StructureAnalysisPanel.svelte';

// Export types
export type * from './types';

// Export utilities
export { normalizeEmotionName, EMOTION_KEYS, isMetadataField } from './lib/emotion-normalization';
export { detectGapAreas, analyzeDensity, detectDuplicates, extractCommonFeatures } from './lib/structure-analysis';
export { calculateWordDistances } from './lib/word-distance';
export { convertTimelinePointToDataPoint } from './types';
