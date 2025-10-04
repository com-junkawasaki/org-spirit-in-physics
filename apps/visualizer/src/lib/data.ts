import { createServerSupabaseClient, Database } from './supabase'
import { SupabaseClient } from '@supabase/supabase-js'

export interface AnalysisResult {
  id: string
  stimulus_word: string
  response_word: string
  kawasaki_p_value: number
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

// Server-side data fetching functions
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createServerSupabaseClient()

  // Get basic counts
  const [participantsResult, sessionsResult, responsesResult] = await Promise.all([
    supabase.from('participants').select('id', { count: 'exact' }),
    supabase.from('participant_experiment_sessions').select('id', { count: 'exact' }),
    supabase.from('participant_response_data').select('id', { count: 'exact' })
  ])

  // Get analysis results for averages
  const { data: analysisResults } = await supabase
    .from('analysis_results')
    .select('kawasaki_p_value, word2vec_component, reaction_time_component, skin_potential_component, emotion_component')

  // Calculate averages
  const totalResults = analysisResults?.length || 0
  const averageSpiritProbability = totalResults > 0
    ? analysisResults!.reduce((sum, r) => sum + r.kawasaki_p_value, 0) / totalResults
    : 0

  const componentAverages = totalResults > 0 ? {
    word2vec: analysisResults!.reduce((sum, r) => sum + r.word2vec_component, 0) / totalResults,
    reaction_time: analysisResults!.reduce((sum, r) => sum + r.reaction_time_component, 0) / totalResults,
    skin_potential: analysisResults!.reduce((sum, r) => sum + r.skin_potential_component, 0) / totalResults,
    emotion: analysisResults!.reduce((sum, r) => sum + r.emotion_component, 0) / totalResults,
  } : { word2vec: 0, reaction_time: 0, skin_potential: 0, emotion: 0 }

  // Get emotion distribution from responses
  const { data: emotionData } = await supabase
    .from('participant_response_data')
    .select('emotion')

  const emotionDistribution: Record<string, number> = {}
  emotionData?.forEach(row => {
    const emotion = row.emotion || 'unknown'
    emotionDistribution[emotion] = (emotionDistribution[emotion] || 0) + 1
  })

  return {
    totalParticipants: participantsResult.count || 0,
    totalSessions: sessionsResult.count || 0,
    totalResponses: responsesResult.count || 0,
    averageSpiritProbability,
    emotionDistribution,
    componentAverages
  }
}

export async function getAllParticipants(): Promise<ParticipantData[]> {
  const supabase = createServerSupabaseClient()

  const { data: participants } = await supabase
    .from('participants')
    .select(`
      id,
      name,
      participant_experiment_sessions (
        id,
        session_id,
        session_type,
        start_time,
        end_time
      ),
      analysis_runs (
        id,
        run_id,
        status,
        created_at,
        completed_at
      )
    `)

  if (!participants) return []

  return participants.map(p => ({
    id: p.id,
    name: p.name,
    sessions: (p.participant_experiment_sessions as any[]) || [],
    analysisRuns: (p.analysis_runs as any[]) || []
  }))
}

export async function getParticipantData(participantId: string): Promise<ParticipantData | null> {
  const supabase = createServerSupabaseClient()

  const { data: participant } = await supabase
    .from('participants')
    .select(`
      id,
      name,
      participant_experiment_sessions (
        id,
        session_id,
        session_type,
        start_time,
        end_time,
        participant_response_data (
          id,
          stimulus_word,
          response_word,
          reaction_time_ms,
          skin_potential,
          emotion,
          emotion_confidence
        )
      ),
      analysis_runs (
        id,
        run_id,
        status,
        created_at,
        completed_at,
        analysis_results (
          id,
          stimulus_word,
          response_word,
          kawasaki_p_value,
          word2vec_component,
          reaction_time_component,
          skin_potential_component,
          emotion_component,
          emotion_data,
          physiological_data,
          created_at
        )
      )
    `)
    .eq('id', participantId)
    .single()

  if (!participant) return null

  return {
    id: participant.id,
    name: participant.name,
    sessions: (participant.participant_experiment_sessions as any[])?.map(s => ({
      ...s,
      responses: s.participant_response_data || []
    })) || [],
    analysisRuns: (participant.analysis_runs as any[])?.map(r => ({
      ...r,
      results: r.analysis_results || []
    })) || []
  }
}

export async function getResponseTimeseries(responseId: string): Promise<{
  skinPotential: SkinPotentialPoint[]
  emotions: EmotionPoint[]
}> {
  const supabase = createServerSupabaseClient()

  const [skinPotentialResult, emotionResult] = await Promise.all([
    supabase
      .from('response_skin_potential_timeseries')
      .select('timestamp_offset_ms, value')
      .eq('response_id', responseId)
      .order('timestamp_offset_ms'),
    supabase
      .from('response_emotion_timeseries')
      .select('timestamp_offset_ms, emotion_type, intensity, confidence')
      .eq('response_id', responseId)
      .order('timestamp_offset_ms')
  ])

  return {
    skinPotential: skinPotentialResult.data || [],
    emotions: emotionResult.data || []
  }
}

export async function getAnalysisResults(participantId?: string): Promise<AnalysisResult[]> {
  const supabase = createServerSupabaseClient()

  let query = supabase
    .from('analysis_results')
    .select('*')
    .order('created_at', { ascending: false })

  if (participantId) {
    // Join with analysis_runs to filter by participant
    const { data: runIds } = await supabase
      .from('analysis_runs')
      .select('id')
      .eq('participant_id', participantId)

    if (runIds && runIds.length > 0) {
      query = query.in('run_id', runIds.map(r => r.id))
    } else {
      return []
    }
  }

  const { data } = await query
  return data || []
}

export async function getAnalysisResultsForParticipant(participantId: string): Promise<AnalysisResult[]> {
  const supabase = createServerSupabaseClient()

  // Get participant responses first
  const { data: responses } = await supabase
    .from('participant_response_data')
    .select('id, stimulus_word, response_word, reaction_time_ms, emotion_data')
    .eq('participant_id', participantId)
    .order('timestamp', { ascending: false })

  if (!responses || responses.length === 0) {
    return []
  }

  // Get analysis results for these responses
  const responseIds = responses.map(r => r.id)
  const { data: analysisResults } = await supabase
    .from('analysis_results')
    .select('*')
    .in('response_id', responseIds)
    .order('created_at', { ascending: false })

  // Merge response data with analysis results
  return (analysisResults || []).map(result => {
    const response = responses.find(r => r.id === result.response_id)
    return {
      ...result,
      stimulus_word: response?.stimulus_word || '',
      response_word: response?.response_word || '',
      reaction_time_ms: response?.reaction_time_ms || 0,
      emotion_data: response?.emotion_data || {}
    }
  })
}
