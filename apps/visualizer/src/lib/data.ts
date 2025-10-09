import { createTerminusDBClient } from './supabase'

export interface AnalysisResult {
  id: string
  stimulus_word?: string
  response_word?: string
  p_value: number
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
  const supabase = await createServerSupabaseClient()

  const { data: participants, error: participantsError } = await supabase
    .from('participants')
    .select('id, name')

  if (!participants || participantsError) {
    console.error('Failed to fetch participants:', participantsError)
    return []
  }

  // For each participant, get their sessions and analysis runs
  const participantsWithData = await Promise.all(
    participants.map(async (participant) => {
      const [sessionsResult, analysisRunsResult] = await Promise.all([
        supabase
          .from('participant_experiment_sessions')
          .select('id, session_id, session_type, start_time, end_time')
          .eq('participant_id', participant.id),
        supabase
          .from('analysis_runs')
          .select('id, run_id, status, created_at, completed_at')
          .eq('participant_id', participant.id)
      ])

      // Get responses for each session
      const sessionsWithResponses = await Promise.all(
        (sessionsResult.data || []).map(async (session) => {
          const { data: responses } = await supabase
            .from('participant_response_data')
            .select('id, stimulus_word, response_word, reaction_time_ms, skin_potential, emotion, emotion_confidence')
            .eq('participant_id', participant.id)
            .eq('experiment_id', session.id)

          return {
            ...session,
            responses: responses || []
          }
        })
      )

      // Get results for each analysis run
      const analysisRunsWithResults = await Promise.all(
        (analysisRunsResult.data || []).map(async (run) => {
          const { data: results } = await supabase
            .from('analysis_results')
            .select('id, p_value, word2vec_component, reaction_time_component, skin_potential_component, emotion_component, emotion_data, physiological_data, created_at')
            .eq('run_id', run.id)

          return {
            ...run,
            results: results || []
          }
        })
      )

      return {
        id: participant.id,
        name: participant.name,
        sessions: sessionsWithResponses,
        analysisRuns: analysisRunsWithResults
      }
    })
  )

  return participantsWithData
}

export async function getParticipantData(participantId: string): Promise<ParticipantData | null> {
  try {
    const client = createTerminusDBClient()

    // Get participant details
    const participant = await client.getParticipantDetails(participantId)
    if (!participant) return null

    // Get participant responses
    const responses = await client.getParticipantResponses(participantId)

    // Group responses by session
    const sessionMap: Record<string, ResponseData[]> = {}
    responses.forEach(response => {
      const sessionId = response.session_id || 'unknown'
      if (!sessionMap[sessionId]) {
        sessionMap[sessionId] = []
      }
      sessionMap[sessionId].push({
        id: response.id,
        stimulus_word: response.stimulus_word,
        response_word: response.response_word,
        reaction_time_ms: response.reaction_time_ms,
        skin_potential: 0, // Placeholder
        emotion: response.emotion || '',
        emotion_confidence: response.emotion_confidence,
        skinPotentialTimeseries: [], // Placeholder
        emotionTimeseries: [] // Placeholder
      })
    })

    // Create sessions array
    const sessions: ExperimentSession[] = Object.entries(sessionMap).map(([sessionId, sessionResponses]) => ({
      id: sessionId,
      session_id: sessionId,
      session_type: 'session-1', // Placeholder
      start_time: null,
      end_time: null,
      responses: sessionResponses
    }))

    // Create mock analysis runs (since we don't have analysis results in TerminusDB yet)
    const analysisRuns: AnalysisRun[] = [{
      id: 'latest',
      run_id: 'latest',
      status: 'completed',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      results: responses.map(response => ({
        id: response.id,
        stimulus_word: response.stimulus_word,
        response_word: response.response_word,
        p_value: 0.5, // Placeholder
        word2vec_component: 0,
        reaction_time_component: 0,
        skin_potential_component: 0,
        emotion_component: 0,
        emotion_data: {},
        physiological_data: {},
        created_at: new Date().toISOString()
      }))
    }]

    return {
      id: participant.id,
      name: `Participant ${participantId.slice(0, 8)}`, // Default name if not available
      sessions,
      analysisRuns
    }
  } catch (error) {
    console.error('Failed to get participant data:', error)
    return null
  }
}

export async function getResponseTimeseries(responseId: string): Promise<{
  skinPotential: SkinPotentialPoint[]
  emotions: EmotionPoint[]
}> {
  // Placeholder implementation for TerminusDB
  // TODO: Implement proper timeseries data retrieval from TerminusDB
  console.log('Getting timeseries data for response:', responseId)

  return {
    skinPotential: [], // Placeholder
    emotions: [] // Placeholder
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

  // Get analysis results using the new table structure
  const { data: analysisResults } = await supabase
    .from('participant_analysis_results')
    .select('*')
    .eq('participant_id', participantId)
    .order('created_at', { ascending: false })

  if (!analysisResults || analysisResults.length === 0) {
    return []
  }

  // Transform to the expected format
  return analysisResults.map(result => ({
    id: result.id,
    stimulus_word: result.stimulus_word,
    response_word: result.response_word,
    p_value: result.spirit_probability,
    word2vec_component: result.word2vec_component || 0,
    reaction_time_component: result.reaction_time_component || 0,
    skin_potential_component: result.skin_potential_component || 0,
    emotion_component: result.emotion_component || 0,
    emotion_data: result.emotion_data || {},
    physiological_data: result.physiological_data || {},
    created_at: result.created_at,
    reaction_time_ms: result.reaction_time_ms || 0
  }))
}
