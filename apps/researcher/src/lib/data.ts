// Merkle DAG: data
// Server-side data fetching functions
// This file now uses Connect RPC internally (via lib/connect/data.ts)

// Re-export from Connect RPC version for backward compatibility
export {
  getAllParticipants,
  getParticipantData,
  getDashboardStats,
  type ParticipantData,
  type DashboardStats,
} from './connect/data';

// Legacy types and interfaces (for backward compatibility)
export interface AnalysisResult {
  id: string
  stimulus_word?: string
  response_word?: string
  p_value: number
  word2vec_component: number
  reaction_time_component: number
  skin_potential_component: number
  emotion_component: number
  emotion_data: Record<string, number>
  physiological_data: Record<string, unknown> | null
  created_at: string
  reaction_time_ms?: number
}

export interface ExperimentSession {
  id: string
  session_id: string
  session_type: string
  start_time: string | null
  end_time: string | null
  responses: ResponseData[]
  responseCount: number
}

export interface ResponseData {
  id: string
  stimulus_word: string
  response_word: string
  reaction_time_ms: number
  skin_potential: number
  emotion: string
  emotion_confidence: number
  skinPotentialTimeseries?: SkinPotentialPoint[]
  emotionTimeseries?: EmotionPoint[]
}

export interface SkinPotentialPoint {
  timestamp_offset_ms: number
  value: number
}

export interface EmotionPoint {
  timestamp_offset_ms: number
  emotion_type: string
  intensity: number
  confidence: number
}

export interface AnalysisRun {
  id: string
  run_id: string
  status: string
  created_at: string
  completed_at: string | null
  results: AnalysisResult[]
}

// Legacy functions (placeholder implementations)
export async function getResponseTimeseries(responseId: string): Promise<{
  skinPotential: SkinPotentialPoint[]
  emotions: EmotionPoint[]
}> {
  // Placeholder implementation
  console.log('Getting timeseries data for response:', responseId)
  return {
    skinPotential: [],
    emotions: []
  }
}

export async function getAnalysisResults(participantId?: string): Promise<AnalysisResult[]> {
  // Placeholder implementation
  // TODO: Implement using Connect RPC if needed
  console.log('Getting analysis results for participant:', participantId)
  return []
}

export async function getAnalysisResultsForParticipant(participantId: string): Promise<AnalysisResult[]> {
  // Placeholder implementation
  // TODO: Implement using Connect RPC if needed
  console.log('Getting analysis results for participant:', participantId)
  return []
}
