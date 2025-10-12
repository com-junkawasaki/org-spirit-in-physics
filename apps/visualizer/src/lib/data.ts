import { createArangoDBClient } from './arangodb'

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
  reaction_time_ms?: number
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
  try {
    const client = createArangoDBClient()

    // Get participants count
    const participantsQuery = `RETURN LENGTH(participants)`
    const participantsResult = await client.query(participantsQuery)
    const totalParticipants = participantsResult[0] || 0

    // Get sessions count
    const sessionsQuery = `RETURN LENGTH(participant_sessions)`
    const sessionsResult = await client.query(sessionsQuery)
    const totalSessions = sessionsResult[0] || 0

    // Get responses count
    const responsesQuery = `RETURN LENGTH(participant_session_responses)`
    const responsesResult = await client.query(responsesQuery)
    const totalResponses = responsesResult[0] || 0

    // Get emotion distribution
    const emotionQuery = `
      FOR response IN participant_session_responses
        FILTER response.emotion != null
        COLLECT emotion = response.emotion WITH COUNT INTO count
        RETURN { emotion, count }
    `
    const emotionResult = await client.query(emotionQuery)
    const emotionDistribution: Record<string, number> = {}
    emotionResult?.forEach((item: any) => {
      emotionDistribution[item.emotion || 'unknown'] = item.count || 0
    })

    // Mock analysis results (since we don't have analysis results in ArangoDB yet)
    const averageSpiritProbability = 0.5
    const componentAverages = {
      word2vec: 0.1,
      reaction_time: 0.2,
      skin_potential: 0.1,
      emotion: 0.3
    }

    return {
      totalParticipants,
      totalSessions,
      totalResponses,
      averageSpiritProbability,
      emotionDistribution,
      componentAverages
    }
  } catch (error) {
    console.error('Failed to get dashboard stats:', error)
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
    const client = createArangoDBClient()
    const participants = await client.getParticipants()

    // For each participant, get detailed data
    const participantsWithData = await Promise.all(
      participants.map(async (participant) => {
        const participantId = participant.participant_id
        const participantData = await getParticipantData(participantId)
        return participantData || {
          id: participantId,
          name: `Participant ${participantId.slice(0, 8)}`,
          sessions: [],
          analysisRuns: []
        }
      })
    )

    return participantsWithData.filter(Boolean) as ParticipantData[]
  } catch (error) {
    console.error('Failed to fetch all participants:', error)
    return []
  }
}

export async function getParticipantData(participantId: string): Promise<ParticipantData | null> {
  try {
    const client = createArangoDBClient()

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
  try {
    // For now, return mock analysis results since we don't have analysis results in TerminusDB yet
    // In the future, this should query actual analysis results from TerminusDB

    if (participantId) {
      return getAnalysisResultsForParticipant(participantId)
    }

    // Mock data for all participants
    return [
      {
        id: 'mock-result-1',
        stimulus_word: 'love',
        response_word: 'peace',
        p_value: 0.85,
        word2vec_component: 0.3,
        reaction_time_component: 0.2,
        skin_potential_component: 0.1,
        emotion_component: 0.25,
        emotion_data: { joy: 0.8, sadness: 0.1 },
        physiological_data: { gsr: 2.3 },
        created_at: new Date().toISOString(),
        reaction_time_ms: 1200
      },
      {
        id: 'mock-result-2',
        stimulus_word: 'hate',
        response_word: 'anger',
        p_value: 0.72,
        word2vec_component: 0.2,
        reaction_time_component: 0.15,
        skin_potential_component: 0.12,
        emotion_component: 0.25,
        emotion_data: { anger: 0.7, fear: 0.2 },
        physiological_data: { gsr: 3.1 },
        created_at: new Date().toISOString(),
        reaction_time_ms: 950
      }
    ]
  } catch (error) {
    console.error('Failed to get analysis results:', error)
    return []
  }
}

export async function getAnalysisResultsForParticipant(participantId: string): Promise<AnalysisResult[]> {
  try {
    // Get participant responses and generate mock analysis results
    const client = createArangoDBClient()
    const responses = await client.getParticipantResponses(participantId)

    // Generate mock analysis results based on responses
    return responses.map((response, index) => ({
      id: `analysis-${participantId}-${index}`,
      stimulus_word: response.stimulus_word,
      response_word: response.response_word,
      p_value: 0.5 + Math.random() * 0.4, // Random value between 0.5-0.9
      word2vec_component: (Math.random() - 0.5) * 0.4,
      reaction_time_component: 10 / (1 + response.reaction_time_ms / 1000),
      skin_potential_component: 0.1,
      emotion_component: response.emotion_confidence,
      emotion_data: { [response.emotion || 'unknown']: response.emotion_confidence },
      physiological_data: {},
      created_at: new Date().toISOString(),
      reaction_time_ms: response.reaction_time_ms
    }))
  } catch (error) {
    console.error('Failed to get analysis results for participant:', error)
    return []
  }
}
