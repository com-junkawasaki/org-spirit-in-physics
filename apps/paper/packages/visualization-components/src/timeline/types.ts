// Merkle DAG: timeline.types
// 時系列可視化コンポーネントの型定義

// TypeGPU 用型
export interface WordNode {
  id: string
  label: string
  scale: number
  axis?: [number, number, number]
  fixed?: boolean
  nodeType?: 'word' | 'anchor'
  initial?: [number, number, number]
  color?: string
}

export interface WordLink {
  source: number
  target: number
  weight: number
  mode?: 'tension' | 'compression'
  L0?: number
  k?: number
  color?: string
}

export interface WordDetailStats {
  word: string
  overall: {
    reactionTimeAvg: number
    physioAvg: number
    reactionValueAvg: number
    prosodyAvg: number
    burstAvg: number
    faceAvg: number
    languageAvg: number
  }
  first: WordDetailStats['overall']
  second: WordDetailStats['overall']
}

export interface EmotionData {
  name: string
  score: number
  fileType: string
}

export interface TimelineDataPoint {
  timestamp: number
  word: string
  reactionTime: number
  hasResponse: boolean
  emotions: EmotionData[]
  physiological: { average?: number; max?: number; min?: number } | unknown[]
  reactionValue: number
  eventType?: string
  metadata?: { emotionCount?: number; physiologicalCount?: number }
}

export interface FilterSettings {
  emotions: boolean
  physiological: boolean
  reactionValues: boolean
  wordDisplay: boolean
  reactionTime: boolean
  physiologicalThreshold: boolean
  emotionChange: boolean
  range: number
  timeScale: number
  verticalScale: number
  showEmotionDetails: boolean
  showWordLabels: boolean
}

export interface TimeRange {
  start: number
  end: number
}

export type VisualizationMode = 'timeline' | 'kpi' | 'dumbbell' | 'small-multiples' | 'force-3d-typegpu'

// Word aggregates data types (for props injection)
export interface WordAggregateData {
  word: string
  count: number
  avgReactionValue: number
  sumReactionValue: number
  avgReactionTime: number
  sumReactionTime: number
  avgPhysiological: number
  sumPhysAbs: number
  physSeries: number[]
  rtSeries: number[]
  rvSeries: number[]
}

export interface EmotionVectorData {
  word: string
  joySum: number
  sadnessSum: number
  angerSum: number
  fearSum: number
  surpriseSum: number
  disgustSum: number
  calmSum: number
  focusSum: number
  excitementSum: number
  confusionSum: number
  emotionEntryCount: number
  emotionByModality?: any
}

export interface WordStatisticsData {
  word: string
  count: number
  avgReactionTime: number
  stdReactionTime: number
  varReactionTime: number
  avgReactionValue: number
  stdReactionValue: number
  varReactionValue: number
  avgPhysiological: number
  stdPhysiological: number
  varPhysiological: number
  speedIndex: number
  physSeries: number[]
  rtSeries: number[]
}

export interface TimelineVisualizationProps {
  participantId: string
  sessionId?: string
  width?: number
  height?: number
  // このページでモードを固定したい場合に指定（例: 'force-3d-typegpu'）
  forceMode?: VisualizationMode
  // フィルターUIを非表示にする
  hideFilters?: boolean
  // Word aggregates data (optional, injected from parent app)
  wordAggregates?: WordAggregateData[]
  emotionVectors?: EmotionVectorData[]
  wordStatistics?: WordStatisticsData[]
  aggregatesLoading?: boolean
  aggregatesError?: string | null
}

export interface KPICalculations {
  current: {
    avgReactionTime: number
    avgReactionValue: number
    responseRate: number
    totalResponses: number
  }
  previous: {
    avgReactionTime: number
    avgReactionValue: number
    responseRate: number
    totalResponses: number
  }
  changes: {
    avgReactionTime: number
    avgReactionValue: number
    responseRate: number
    totalResponses: number
  }
}

export interface DumbbellDataPoint {
  word: string
  firstHalf: {
    avgReactionTime: number
    avgReactionValue: number
    count: number
  }
  secondHalf: {
    avgReactionTime: number
    avgReactionValue: number
    count: number
  }
}

export interface SmallMultiplesDataPoint {
  word: string
  data: TimelineDataPoint[]
  stats: {
    avgReactionTime: number
    avgReactionValue: number
    maxReactionValue: number
    responseRate: number
  }
}

export interface ForcePreset {
  id: string
  label: string
  springK: number
  repulsionK: number
  restLength: number
  damping: number
  emoWeak: number
  emoStrong: number
  emoGain: number
}

export interface Force3DGraphData {
  nodes: WordNode[]
  links: WordLink[]
}

export interface WordDistancePair {
  word1: string
  word2: string
  totalDistance: number
  emotionDistance: number
  reactionValueDistance: number
  reactionTimeDistance: number
  physiologicalDistance: number
}

export interface ModalityEmotionStats {
  modality: 'burst' | 'face' | 'language' | 'prosody'
  totalEmotions: number
  emotionDistribution: Record<string, number> // emotion name -> count
  emotionScores: Record<string, number[]> // emotion name -> scores array
  wordsWithEmotions: number
  wordsWithoutEmotions: number
  sampleWordsWithoutEmotions: string[]
}

// Merkle DAG: timeline.types -> definitions_complete
// 時系列可視化コンポーネントの型定義完了
