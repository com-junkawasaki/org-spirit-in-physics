import { getSupabaseClient } from '@spiritinphysics/supabase'
import { supabaseManager } from '@spiritinphysics/database'

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

export interface ParticipantData {
  id: string
  name: string | null
  sessions: ExperimentSession[]
  analysisRuns: AnalysisRun[]
  sessionCount: number
  responseCount: number
  averageSpiritProbability: number
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

// Server-side data fetching functions - Supabaseベース
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const client = getSupabaseClient()

    // Get participants count
    const { count: totalParticipants } = await client
      .from('participants')
      .select('*', { count: 'exact', head: true })

    // Get sessions count
    const { count: totalSessions } = await client
      .from('participant_experiment_sessions')
      .select('*', { count: 'exact', head: true })

    // Get responses count
    const { count: totalResponses } = await client
      .from('participant_response_data')
      .select('*', { count: 'exact', head: true })

    // Get responses with emotions
    const { data: responsesWithEmotions } = await client
      .from('participant_response_data')
      .select('emotion')
      .not('emotion', 'is', null)

    // Get analysis results with spirit probability
    const { data: responsesWithSpirit } = await client
      .from('participant_analysis_results')
      .select('spirit_probability')

    // Get analysis results with components
    const { data: responsesWithComponents } = await client
      .from('participant_analysis_results')
      .select('word2vec_component, reaction_time_component, skin_potential_component, emotion_component')
      .not('word2vec_component', 'is', null)
      .not('reaction_time_component', 'is', null)
      .not('skin_potential_component', 'is', null)
      .not('emotion_component', 'is', null)

    // 感情分布を集計
    const emotionDistribution: Record<string, number> = {}
    responsesWithEmotions.forEach(response => {
      if (response.emotion) {
        emotionDistribution[response.emotion] = (emotionDistribution[response.emotion] || 0) + 1
      }
    })

    // 平均Spirit確率を計算
    const averageSpiritProbability = responsesWithSpirit.length > 0
      ? responsesWithSpirit.reduce((sum, r) => sum + (r.spirit_probability || 0), 0) / responsesWithSpirit.length
      : 0.5

    // コンポーネントの平均を計算
    const componentAverages = responsesWithComponents.length > 0 ? {
      word2vec: responsesWithComponents.reduce((sum, r) => sum + (r.word2vec_component || 0), 0) / responsesWithComponents.length,
      reaction_time: responsesWithComponents.reduce((sum, r) => sum + (r.reaction_time_component || 0), 0) / responsesWithComponents.length,
      skin_potential: responsesWithComponents.reduce((sum, r) => sum + (r.skin_potential_component || 0), 0) / responsesWithComponents.length,
      emotion: responsesWithComponents.reduce((sum, r) => sum + (r.emotion_component || 0), 0) / responsesWithComponents.length,
    } : {
      word2vec: 0.1,
      reaction_time: 0.2,
      skin_potential: 0.1,
      emotion: 0.3,
    }

    return {
      totalParticipants,
      totalSessions,
      totalResponses,
      averageSpiritProbability,
      emotionDistribution,
      componentAverages,
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
        emotion: 0,
      }
    }
  }
}

/**
 * Get all participants using GraphQL
 * 
 * Merkle DAG: data.get_all_participants_graphql
 * OWL: spirit:DataCollection via GraphQL
 */
export async function getAllParticipants(): Promise<ParticipantData[]> {
  try {
    // Use Apollo Client for GraphQL queries
    const { apolloClient } = await import('@/lib/graphql/client');
    const { GET_PARTICIPANTS } = await import('@/lib/graphql/queries/participants');
    
    const result = await apolloClient.query({
      query: GET_PARTICIPANTS,
      fetchPolicy: 'network-only', // Always fetch fresh data for server-side
    });

    if (result.error || (result.data as any)?.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.error || (result.data as any)?.errors)}`);
    }

    const graphqlParticipants = (result.data as any)?.participants || [];
    
    // For each participant, get detailed data
    const participantsWithData = await Promise.all(
      graphqlParticipants.map(async (participant: any) => {
        const participantId = participant.id
        const participantData = await getParticipantData(participantId)
        return participantData || {
          id: participantId,
          name: `Participant ${participantId.slice(0, 8)}`,
          sessions: [],
          analysisRuns: [],
          sessionCount: 0,
          responseCount: 0,
          averageSpiritProbability: 0,
        }
      })
    )

    return participantsWithData.filter(Boolean) as ParticipantData[]
  } catch (error) {
    console.error('Failed to fetch all participants:', error)
    // Fallback to Supabase if GraphQL fails
    try {
      const participants = await supabaseManager.getParticipants()
      return participants.map((p: any) => ({
        id: p.participant_id,
        name: `Participant ${p.participant_id.slice(0, 8)}`,
        sessions: [],
        analysisRuns: [],
        sessionCount: p.session_count || 0,
        responseCount: p.total_responses || 0,
        averageSpiritProbability: p.average_spirit_probability || 0,
      }))
    } catch (fallbackError) {
      console.error('Fallback to Supabase also failed:', fallbackError)
      return []
    }
  }
}

/**
 * Get participant data using GraphQL
 * 
 * Merkle DAG: data.get_participant_data_graphql
 * OWL: spirit:DataCollection via GraphQL
 */
export async function getParticipantData(participantId: string): Promise<ParticipantData | null> {
  try {
    // Use Apollo Client for GraphQL queries
    const { apolloClient } = await import('@/lib/graphql/client');
    const { GET_PARTICIPANT } = await import('@/lib/graphql/queries/participants');
    const { GET_SESSIONS_BY_PARTICIPANT } = await import('@/lib/graphql/queries/sessions');
    
    // Fetch participant and sessions in parallel
    const [participantResult, sessionsResult] = await Promise.all([
      apolloClient.query({
        query: GET_PARTICIPANT,
        variables: { id: participantId },
        fetchPolicy: 'network-only',
      }),
      apolloClient.query({
        query: GET_SESSIONS_BY_PARTICIPANT,
        variables: { participantId },
        fetchPolicy: 'network-only',
      }),
    ]);

    if (participantResult.error || sessionsResult.error || 
        (participantResult.data as any)?.errors || (sessionsResult.data as any)?.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(
        participantResult.error || sessionsResult.error || 
        (participantResult.data as any)?.errors || (sessionsResult.data as any)?.errors
      )}`);
    }

    const participant = (participantResult.data as any)?.participant;
    if (!participant) return null;

    const dbSessions = (sessionsResult.data as any)?.sessionsByParticipant || [];

    // レスポンスを取得
    const responses = await supabaseManager.getParticipantResponses(participantId)

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
        reaction_time_ms: response.reaction_time_ms || 0,
        skin_potential: 0, // Placeholder - 生理データ統合時に実装
        emotion: response.emotion || '',
        emotion_confidence: response.emotion_confidence || 0,
        skinPotentialTimeseries: [], // Placeholder - 時系列データ統合時に実装
        emotionTimeseries: [] // Placeholder - 時系列データ統合時に実装
      })
    })

    // Create sessions array - include both sessions from database and those inferred from responses
    const sessions: ExperimentSession[] = (dbSessions || []).map((dbSession: any) => {
      const sessionId = dbSession.id
      const sessionResponses = sessionMap[sessionId] || []

      return {
        id: sessionId,
        session_id: sessionId,
        session_type: dbSession.session_type || 'session-1',
        start_time: dbSession.start_time || null,
        end_time: dbSession.end_time || null,
        responses: sessionResponses,
        responseCount: sessionResponses.length,
      }
    })

    // セッションが存在しないレスポンスがある場合の処理
    Object.entries(sessionMap).forEach(([sessionId, sessionResponses]) => {
      if (!sessions.find(s => s.id === sessionId)) {
        sessions.push({
          id: sessionId,
          session_id: sessionId,
          session_type: 'word_association',
          start_time: null,
          end_time: null,
          responses: sessionResponses,
          responseCount: sessionResponses.length,
        })
      }
    })

    // 分析結果の作成 - Spirit確率を含む実際のデータを使用
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
        p_value: response.spirit_probability || 0.5,
        word2vec_component: 0, // TODO: 実際のWord2Vecコンポーネントを実装
        reaction_time_component: response.reaction_time_ms ? 10 / (1 + response.reaction_time_ms / 1000) : 0,
        skin_potential_component: 0, // TODO: 生理データコンポーネントを実装
        emotion_component: response.emotion_confidence || 0,
        emotion_data: response.emotion ? { [response.emotion]: response.emotion_confidence || 0 } : {},
        physiological_data: {}, // TODO: 生理データを統合
        created_at: response.event_ts || new Date().toISOString(),
        reaction_time_ms: response.reaction_time_ms,
      }))
    }]

    const sessionCount = sessions.length
    const responseCount = responses.length
    const averageSpiritProbability = responses.length > 0
      ? responses.reduce((sum, response) => sum + (response.spirit_probability || 0), 0) / responses.length
      : 0

    return {
      id: participant.id,
      name: `Participant ${participantId.slice(0, 8)}`, // デフォルト名
      sessions,
      analysisRuns,
      sessionCount,
      responseCount,
      averageSpiritProbability,
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
    // 参加者の分析結果を取得（participant_analysis_resultsテーブルから）
    const { data: analysisResults } = await getSupabaseClient()
      .from('participant_analysis_results')
      .select('*')
      .eq('participant_id', participantId)
      .order('created_at', { ascending: false })

    if (!analysisResults || analysisResults.length === 0) {
      // フォールバック: レスポンスデータから分析結果を生成
      const responses = await supabaseManager.getParticipantResponses(participantId)

      // 実際のデータに基づいて分析結果を生成
      return responses.map((response, index) => ({
        id: `analysis-${participantId}-${index}`,
        stimulus_word: response.stimulus_word,
        response_word: response.response_word,
        p_value: response.spirit_probability || 0.5,
        word2vec_component: 0, // TODO: 実際のWord2Vecコンポーネントを実装
        reaction_time_component: response.reaction_time_ms ? 10 / (1 + response.reaction_time_ms / 1000) : 0,
        skin_potential_component: 0, // TODO: 生理データコンポーネントを実装
        emotion_component: response.emotion_confidence || 0,
        emotion_data: response.emotion ? { [response.emotion]: response.emotion_confidence || 0 } : {},
        physiological_data: {}, // TODO: 生理データを統合
        created_at: response.event_ts || new Date().toISOString(),
        reaction_time_ms: response.reaction_time_ms,
      }))
    }

    // 分析結果テーブルから直接取得
    return analysisResults.map((result: any) => ({
      id: result.id,
      stimulus_word: result.stimulus_word,
      response_word: result.response_word,
      p_value: Number(result.spirit_probability) || 0.5,
      word2vec_component: Number(result.word2vec_component) || 0,
      reaction_time_component: Number(result.reaction_time_component) || 0,
      skin_potential_component: Number(result.skin_potential_component) || 0,
      emotion_component: Number(result.emotion_component) || 0,
      emotion_data: result.emotion_data || {},
      physiological_data: result.physiological_data || {},
      created_at: result.created_at || new Date().toISOString(),
      reaction_time_ms: result.reaction_time_ms || undefined,
    }))
  } catch (error) {
    console.error('Failed to get analysis results for participant:', error)
    return []
  }
}
