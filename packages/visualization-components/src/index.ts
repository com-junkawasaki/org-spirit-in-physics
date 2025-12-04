// Merkle DAG: visualization_components.package
// Common visualization components package
// Exports: TimelineVisualization, Force3DWordGraphTypeGPU, WordDistanceVisualization, types, utilities

export { default as TimelineVisualization } from './TimelineVisualization.tsx'
export { default as Force3DWordGraphTypeGPU } from './Force3DWordGraphTypeGPU'
export { default as WordDistanceVisualization } from './WordDistanceVisualization'

// Export types
export type {
  TimelineVisualizationProps,
  TimelineDataPoint,
  WordNode,
  WordLink,
  WordDistancePair,
  ForcePreset,
  FilterSettings,
  TimeRange,
  WordAggregateData,
  EmotionVectorData,
  WordStatisticsData
} from './timeline/types'

// Export utilities
export { normalizeEmotionName, EMOTION_KEYS, type EmotionKey } from './lib/emotion-normalization'
export { detectGapAreas, analyzeDensity, detectDuplicates, type GapArea, type DensityRegion, type DuplicateCandidate } from './lib/structure-analysis'
export { JUNG_STIMULUS_WORDS, type JungWord } from './constants/jung'
export { calculateWordDistances, type WordResponseData } from './lib/word-distance'
