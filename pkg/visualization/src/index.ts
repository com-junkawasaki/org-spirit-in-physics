// Types
export * from './types'

// Emotion normalization
export {
  normalizeEmotionName,
  isMetadataField,
  EMOTION_KEYS,
  type EmotionKey
} from './emotion-normalization'

// Structure analysis
export {
  detectGapAreas,
  extractCommonFeatures,
  analyzeDensity,
  detectDuplicates
} from './structure-analysis'
