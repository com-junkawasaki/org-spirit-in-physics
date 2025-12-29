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
  t: { s: number; n: number }; // Protobuf Timestamp format
  w: string; // word
  rt: number; // reaction_time
  hr: boolean; // has_response
  e: Array<{ n: string; s: number; f: string }>; // emotions: name, score, file_type
  p: Array<{ v: number; m: string }>; // physiological: value, measurement_type
  rv: number; // reaction_value
  et?: string; // event_type
}

export interface GapArea {
  id: string
  center: [number, number, number]
  radius: number
  nearby_nodes: Array<{
    node_id: string
    label: string
    distance: number
    common_features: string[]
  }>
  suggested_items: string[]
  confidence: number
  common_emotion_profile?: Record<string, number>
}

export interface CommonFeatures {
  emotion_profile: Record<string, number>
  semantic_tags: string[]
  frequency_range: [number, number]
  reaction_time_range: [number, number]
  reaction_value_range: [number, number]
}

export interface DensityRegion {
  id: string
  center: [number, number, number]
  radius: number
  node_count: number
  density: number
  is_overcrowded: boolean
  suggested_separation?: number
  nodes: WordNode[]
}

export interface DuplicateCandidate {
  id: string
  node_ids: string[]
  labels: string[]
  similarity: number
  common_features: CommonFeatures
  suggested_merge: boolean
  distance: number
}

export interface AnalysisResults {
  gap_areas: GapArea[]
  density_regions: DensityRegion[]
  duplicates: DuplicateCandidate[]
  overall_density: number
}

// Types for Jung Voice Assessment Workflow
export interface StimulusWord {
  id: number;
  japanese: string;
  english: string;
}

export interface WordResponse {
  stimulusWord: StimulusWord;
  responseWord: string;
  reactionTimeMs: number;
}

export interface ParticipantDemographics {
  ageGroup: string;
  gender: string;
  ethnicity: string;
  incomeRange: string;
  medicalHistory: string[];
}

export interface AssessmentState {
  participantId: string;
  email: string;
  status: 'idle' | 'preflight' | 'session-1-running' | 'session-1-complete' | 'session-2-running' | 'completed';
  demographics: ParticipantDemographics;
  responses: WordResponse[];
  artifacts: Array<{
    type: 'video' | 'image' | 'audio';
    url: string;
    session: number;
  }>;
}

