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

export interface TimelineVisualizationProps {
  participantId: string
  sessionId?: string
  width?: number
  height?: number
  // このページでモードを固定したい場合に指定（例: 'force-3d-typegpu'）
  forceMode?: VisualizationMode
  // フィルターUIを非表示にする
  hideFilters?: boolean
  // デモ用可視化データセットをAPIから取得
  useDemo?: boolean
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

// Merkle DAG: timeline.types -> definitions_complete
// 時系列可視化コンポーネントの型定義完了
