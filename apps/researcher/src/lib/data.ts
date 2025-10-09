// Backend API client instead of direct Supabase access
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8080/api'

export interface AnalysisResult {
  id: string
  stimulus_word: string
  response_word: string
  kawasaki_p_value: number
  reaction_time_ms: number
  word2vec_component: number
  reaction_time_component: number
  skin_potential_component: number
  emotion_component: number
  emotion_data: any
  physiological_data: any
  created_at: string
}

export interface ParticipantData {
  id: string
  name: string | null
  sessions: ExperimentSession[]
  analysisRuns: AnalysisRun[]
}

export interface ExperimentSession {
  id: string
  session_id: string
  session_type: string
  start_time: string | null
  end_time: string | null
  responses: ResponseData[]
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

export interface DashboardStats {
  totalParticipants: number
  totalSessions: number
  totalResponses: number
  averageSpiritProbability: number
  emotionDistribution: Record<string, number>
  componentAverages: {
    word2vec: number
    reaction_time: number
    skin_potential: number
    emotion: number
  }
}

// Server-side data fetching functions using Backend API
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/visualizer/dashboard/stats`)
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats')
    }
    return response.json()
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    // Return default values on error
    return {
      totalParticipants: 0,
      totalSessions: 0,
      totalResponses: 0,
      averageSpiritProbability: 0,
      emotionDistribution: {},
      componentAverages: {
        word2vec: 0,
        reaction_time: 0,
        skin_potential: 0,
        emotion: 0
      }
    }
  }
}

export async function getAllParticipants(): Promise<ParticipantData[]> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/visualizer/participants`)
    if (!response.ok) {
      throw new Error('Failed to fetch participants')
    }
    const participants = await response.json()

    // Convert backend format to frontend format
    return participants.map((p: any) => ({
      id: p.id,
      name: p.name,
      sessions: p.sessions || [],
      analysisRuns: [] // TODO: Add when backend provides this
    }))
  } catch (error) {
    console.error('Failed to fetch participants:', error)
    return []
  }
}

export async function getParticipantData(participantId: string): Promise<ParticipantData | null> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/visualizer/participants/${participantId}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error('Failed to fetch participant data')
    }
    const participant = await response.json()

    // Convert backend format to frontend format
    return {
      id: participant.id,
      name: participant.name,
      sessions: participant.sessions || [],
      analysisRuns: participant.analysisRuns || []
    }
  } catch (error) {
    console.error('Failed to fetch participant data:', error)
    return null
  }
}

export async function getResponseTimeseries(responseId: string): Promise<{
  skinPotential: SkinPotentialPoint[]
  emotions: EmotionPoint[]
}> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/visualizer/responses/${responseId}/timeseries`)
    if (!response.ok) {
      throw new Error('Failed to fetch response timeseries')
    }
    const data = await response.json()

    return {
      skinPotential: data.skinPotential || [],
      emotions: data.emotions || []
    }
  } catch (error) {
    console.error('Failed to fetch response timeseries:', error)
    return {
      skinPotential: [],
      emotions: []
    }
  }
}

export async function getAnalysisResults(participantId?: string): Promise<AnalysisResult[]> {
  try {
    const url = participantId
      ? `${BACKEND_API_URL}/visualizer/analysis-results?participantId=${participantId}`
      : `${BACKEND_API_URL}/visualizer/analysis-results`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Failed to fetch analysis results')
    }
    return response.json()
  } catch (error) {
    console.error('Failed to fetch analysis results:', error)
    return []
  }
}

export async function getAnalysisResultsForParticipant(participantId: string): Promise<AnalysisResult[]> {
  // Use the same endpoint as getAnalysisResults with participantId filter
  return getAnalysisResults(participantId)
}
