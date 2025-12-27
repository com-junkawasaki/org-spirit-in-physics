// Type definitions for visualization analysis
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
  source: number | string
  target: number | string
  weight: number
  mode?: 'tension' | 'compression'
  L0?: number
  k?: number
  color?: string
}

export interface EmotionData {
  name: string
  score: number
  fileType: string
}

export interface TimelineDataPoint {
  time?: { seconds: number | string; nanos: number } | string;
  participant_id: string;
  session_id: string;
  word: string;
  reaction_time: number;
  has_response: boolean;
  emotions: EmotionData[];
  physiological: any[];
  reaction_value: number;
  event_type?: string;
  metadata?: any;
}

export interface GapArea {
  id: string
  center: [number, number, number]
  radius: number
  nearbyNodes: Array<{
    nodeId: string
    label: string
    distance: number
    commonFeatures: string[]
  }>
  suggestedItems: string[]
  confidence: number
  commonEmotionProfile?: Record<string, number>
}

export interface CommonFeatures {
  emotionProfile: Record<string, number>
  semanticTags: string[]
  frequencyRange: [number, number]
  reactionTimeRange: [number, number]
  reactionValueRange: [number, number]
}

export interface DensityRegion {
  id: string
  center: [number, number, number]
  radius: number
  nodeCount: number
  density: number
  isOvercrowded: boolean
  suggestedSeparation?: number
  nodes: WordNode[]
}

export interface DuplicateCandidate {
  id: string
  nodeIds: string[]
  labels: string[]
  similarity: number
  commonFeatures: CommonFeatures
  suggestedMerge: boolean
  distance: number
}

export interface AnalysisResults {
  gapAreas: GapArea[]
  densityRegions: DensityRegion[]
  duplicates: DuplicateCandidate[]
  overallDensity: number
}

