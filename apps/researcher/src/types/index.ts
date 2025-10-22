// Common types for the visualizer dashboard

// Merkle DAG: types.consent_schema -> consent_data_validation
export interface ConsentData {
  participantId: string
  signature: string
  agreements: {
    understand: boolean
    voluntary: boolean
    withdraw: boolean
    recording: boolean
  }
  agreedAt: string
}

export interface ChartDataPoint {
  x: number | string
  y: number
  label?: string
  color?: string
}

export interface TimeSeriesPoint {
  timestamp: number
  value: number
  emotion_type?: string
  confidence?: number
}

export interface EmotionData {
  timestamp: number
  emotions: {
    joy: number
    sadness: number
    anger: number
    fear: number
    surprise: number
    disgust?: number
    neutral?: number
  }
}

export interface ComponentBreakdown {
  word2vec: number
  reaction_time: number
  skin_potential: number
  emotion: number
  total: number
}

export interface ParticipantSummary {
  id: string
  name: string | null
  sessionCount: number
  responseCount: number
  averageSpiritProbability: number
  dominantEmotion: string
  lastActivity: string
}

export interface SessionSummary {
  id: string
  participantId: string
  sessionType: string
  startTime: string | null
  endTime: string | null
  responseCount: number
  averageReactionTime: number
  averageSpiritProbability: number
}

export interface AnalysisMetrics {
  totalParticipants: number
  totalSessions: number
  totalResponses: number
  averageSpiritProbability: number
  emotionDistribution: Record<string, number>
  componentAverages: ComponentBreakdown
  responseTimeDistribution: {
    min: number
    max: number
    median: number
    p25: number
    p75: number
  }
  physiologicalStats: {
    averageSkinPotential: number
    skinPotentialRange: [number, number]
    skinPotentialVariance: number
  }
}

// Filter and sorting options
export interface FilterOptions {
  participantId?: string
  sessionType?: string
  dateRange?: {
    start: Date
    end: Date
  }
  minSpiritProbability?: number
  maxSpiritProbability?: number
  emotionTypes?: string[]
}

export interface SortOptions {
  field: 'timestamp' | 'spirit_probability' | 'reaction_time' | 'participant_name'
  direction: 'asc' | 'desc'
}

// Chart configuration types
export interface ChartConfig {
  type: 'line' | 'bar' | 'scatter' | 'pie' | 'heatmap'
  title: string
  xAxis: string
  yAxis: string
  colors?: string[]
  showLegend?: boolean
  interactive?: boolean
}

// Dashboard layout types
export interface DashboardSection {
  id: string
  title: string
  type: 'stats' | 'chart' | 'table' | 'timeseries'
  config: any
  size: 'small' | 'medium' | 'large'
  position: {
    x: number
    y: number
  }
}

export interface DashboardLayout {
  id: string
  name: string
  sections: DashboardSection[]
  createdBy: string
  createdAt: string
  isDefault?: boolean
}
