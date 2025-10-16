import { createNeo4jClient } from './neo4j'

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

// Server-side data fetching functions - Neogmaベース
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const client = createNeo4jClient()

    // Helper function to convert Neo4j integers to JavaScript numbers
    const toNumber = (value: any): number => {
      if (typeof value === 'object' && value !== null && 'low' in value) {
        return value.low
      }
      return Number(value) || 0
    }

    // Get participants count
    const participantsQuery = `MATCH (p:Participant) RETURN count(p) as total`
    const participantsResult = await client.query(participantsQuery)
    const totalParticipants = toNumber(participantsResult[0]?.total)

    // Get sessions count
    const sessionsQuery = `MATCH (s:ExperimentSession) RETURN count(s) as total`
    const sessionsResult = await client.query(sessionsQuery)
    const totalSessions = toNumber(sessionsResult[0]?.total)

    // Get responses count
    const responsesQuery = `MATCH (r:Response) RETURN count(r) as total`
    const responsesResult = await client.query(responsesQuery)
    const totalResponses = toNumber(responsesResult[0]?.total)

    // Cypherクエリを使ってデータを取得（Neogmaのwhere句でnullチェックがサポートされていないため）
    const emotionQuery = `
      MATCH (r:Response)
      WHERE r.emotion IS NOT NULL
      RETURN r.emotion as emotion
    `
    const spiritQuery = `
      MATCH (r:Response)
      WHERE r.spirit_probability IS NOT NULL
      RETURN r.spirit_probability as spirit_probability
    `
    const componentsQuery = `
      MATCH (r:Response)
      WHERE r.word2vec_component IS NOT NULL AND
            r.reaction_time_component IS NOT NULL AND
            r.skin_potential_component IS NOT NULL AND
            r.emotion_component IS NOT NULL
      RETURN r.word2vec_component as word2vec_component,
             r.reaction_time_component as reaction_time_component,
             r.skin_potential_component as skin_potential_component,
             r.emotion_component as emotion_component
    `

    const [
      responsesWithEmotions,
      responsesWithSpirit,
      responsesWithComponents
    ] = await Promise.all([
      client.query(emotionQuery),
      client.query(spiritQuery),
      client.query(componentsQuery),
    ])

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

export async function getAllParticipants(): Promise<ParticipantData[]> {
  try {
    const client = createNeo4jClient()
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
    return []
  }
}

export async function getParticipantData(participantId: string): Promise<ParticipantData | null> {
  try {
    const client = createNeo4jClient()

    // 参加者詳細を取得
    const participant = await client.getParticipantDetails(participantId)
    if (!participant) return null

    // セッションを取得（Experiment階層経由）
    const sessionsQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession)
      RETURN s, e
      ORDER BY s.start_ts DESC
    `
    const sessionsResult = await client.query(sessionsQuery, { participantId })
    const dbSessions = sessionsResult?.map((record: any) => {
      const session = record.s
      const properties = session && typeof session === 'object' && 'properties' in session
        ? session.properties
        : session
      return {
        id: properties.id,
        participant_id: properties.participant_id,
        start_ts: properties.start_ts,
        end_ts: properties.end_ts,
        status: properties.status,
        total_responses: properties.total_responses,
        completed_responses: properties.completed_responses,
        created_at: properties.created_at,
      }
    }) || []

    // レスポンスを取得
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
        reaction_time_ms: response.reaction_time_ms || 0,
        skin_potential: 0, // Placeholder - 生理データ統合時に実装
        emotion: response.emotion || '',
        emotion_confidence: response.emotion_confidence || 0,
        skinPotentialTimeseries: [], // Placeholder - 時系列データ統合時に実装
        emotionTimeseries: [] // Placeholder - 時系列データ統合時に実装
      })
    })

    // Create sessions array - include both sessions from database and those inferred from responses
    const sessions: ExperimentSession[] = dbSessions.map((dbSession: any) => {
      const sessionId = dbSession.id
      const sessionResponses = sessionMap[sessionId] || []

      return {
        id: sessionId,
        session_id: sessionId,
        session_type: 'word_association', // 固定値として設定
        start_time: dbSession.start_ts || null,
        end_time: dbSession.end_ts || null,
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
    // 参加者のレスポンスを取得
    const client = createNeo4jClient()
    const responses = await client.getParticipantResponses(participantId)

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
  } catch (error) {
    console.error('Failed to get analysis results for participant:', error)
    return []
  }
}

// Merkle DAG: experiments_data_layer -> experiment_management_functions
export interface ExperimentData {
  id: string
  name: string
  description?: string
  participantCount: number
  sessionCount: number
  averageSpiritProbability: number
  createdAt: string
  updatedAt: string
  status: 'active' | 'completed' | 'draft'
}

export interface ExperimentSessionData {
  id: string
  sessionType: string
  startTime: string
  endTime?: string
  participantId: string
  participantName: string
  responseCount: number
  averageSpiritProbability: number
  status: 'completed' | 'in_progress' | 'failed'
}

export interface ExperimentParticipantData {
  id: string
  name: string
  sessionCount: number
  responseCount: number
  averageSpiritProbability: number
  lastActivity: number | null
}

export interface ExperimentAnalysisData {
  experimentId: string
  totalParticipants: number
  totalSessions: number
  totalResponses: number
  averageSpiritProbability: number
  spiritProbabilityDistribution: {
    high: number
    medium: number
    low: number
  }
  topEmotions: Array<{
    emotion: string
    frequency: number
    averageIntensity: number
  }>
  wordAssociationInsights: Array<{
    word: string
    averageResponseTime: number
    spiritCorrelation: number
  }>
}

export interface ExperimentTimelineEvent {
  id: string
  timestamp: string
  type: 'session_start' | 'session_end' | 'participant_join' | 'analysis_complete'
  title: string
  description: string
  participantId?: string
  participantName?: string
  sessionId?: string
}

// Experiment data fetching functions - Neo4j/Neogmaベース
export async function getAllExperiments(): Promise<ExperimentData[]> {
  try {
    const client = createNeo4jClient()
    
    // TODO: Implement Neo4j query for experiments
    // For now, return placeholder data
    return [
      {
        id: 'exp-001',
        name: 'Spirit in Physics Study 2024',
        description: 'Main experiment for Spirit in Physics research',
        participantCount: 12,
        sessionCount: 24,
        averageSpiritProbability: 0.724,
        createdAt: '2024-10-01',
        updatedAt: '2024-10-16',
        status: 'active'
      }
    ]
  } catch (error) {
    console.error('Failed to fetch all experiments:', error)
    return []
  }
}

export async function getExperimentDetail(experimentId: string): Promise<ExperimentData | null> {
  try {
    const client = createNeo4jClient()
    
    // TODO: Implement Neo4j query for experiment detail
    // For now, return placeholder data
    return {
      id: experimentId,
      name: 'Spirit in Physics Study 2024',
      description: 'Main experiment for Spirit in Physics research',
      participantCount: 12,
      sessionCount: 24,
      averageSpiritProbability: 0.724,
      createdAt: '2024-10-01',
      updatedAt: '2024-10-16',
      status: 'active'
    }
  } catch (error) {
    console.error('Failed to get experiment detail:', error)
    return null
  }
}

export async function getExperimentSessions(experimentId: string): Promise<ExperimentSessionData[]> {
  try {
    const client = createNeo4jClient()
    
    // TODO: Implement Neo4j query for experiment sessions
    // For now, return placeholder data
    return [
      {
        id: 'session-001',
        sessionType: 'Word Association Test',
        startTime: '2024-10-01T10:00:00Z',
        endTime: '2024-10-01T11:30:00Z',
        participantId: 'participant-001',
        participantName: 'Participant A',
        responseCount: 100,
        averageSpiritProbability: 0.724,
        status: 'completed'
      },
      {
        id: 'session-002',
        sessionType: 'Word Association Test',
        startTime: '2024-10-02T14:00:00Z',
        endTime: '2024-10-02T15:30:00Z',
        participantId: 'participant-002',
        participantName: 'Participant B',
        responseCount: 95,
        averageSpiritProbability: 0.689,
        status: 'completed'
      }
    ]
  } catch (error) {
    console.error('Failed to get experiment sessions:', error)
    return []
  }
}

export async function getExperimentParticipants(experimentId: string): Promise<ExperimentParticipantData[]> {
  try {
    const client = createNeo4jClient()
    
    // TODO: Implement Neo4j query for experiment participants
    // For now, return placeholder data
    return [
      {
        id: 'participant-001',
        name: 'Participant A',
        sessionCount: 2,
        responseCount: 195,
        averageSpiritProbability: 0.724,
        lastActivity: Date.now() - 86400000 // 1 day ago
      },
      {
        id: 'participant-002',
        name: 'Participant B',
        sessionCount: 1,
        responseCount: 95,
        averageSpiritProbability: 0.689,
        lastActivity: Date.now() - 172800000 // 2 days ago
      }
    ]
  } catch (error) {
    console.error('Failed to get experiment participants:', error)
    return []
  }
}

export async function getExperimentAnalysis(experimentId: string): Promise<ExperimentAnalysisData | null> {
  try {
    const client = createNeo4jClient()
    
    // TODO: Implement Neo4j query for experiment analysis
    // For now, return placeholder data
    return {
      experimentId,
      totalParticipants: 12,
      totalSessions: 24,
      totalResponses: 2400,
      averageSpiritProbability: 0.724,
      spiritProbabilityDistribution: {
        high: 8,
        medium: 3,
        low: 1
      },
      topEmotions: [
        { emotion: '喜び', frequency: 0.35, averageIntensity: 0.72 },
        { emotion: '驚き', frequency: 0.28, averageIntensity: 0.68 },
        { emotion: '恐れ', frequency: 0.22, averageIntensity: 0.45 },
        { emotion: '悲しみ', frequency: 0.15, averageIntensity: 0.38 }
      ],
      wordAssociationInsights: [
        { word: '愛', averageResponseTime: 1.2, spiritCorrelation: 0.89 },
        { word: '神', averageResponseTime: 2.1, spiritCorrelation: 0.92 },
        { word: '死', averageResponseTime: 3.4, spiritCorrelation: 0.45 },
        { word: '生', averageResponseTime: 1.8, spiritCorrelation: 0.78 }
      ]
    }
  } catch (error) {
    console.error('Failed to get experiment analysis:', error)
    return null
  }
}

export async function getExperimentTimeline(experimentId: string): Promise<ExperimentTimelineEvent[]> {
  try {
    const client = createNeo4jClient()
    
    // TODO: Implement Neo4j query for experiment timeline
    // For now, return placeholder data
    return [
      {
        id: 'event-001',
        timestamp: '2024-10-01T09:00:00Z',
        type: 'participant_join',
        title: 'Participant A が実験に参加',
        description: 'Participant A が実験に参加し、同意書に署名しました。',
        participantId: 'participant-001',
        participantName: 'Participant A'
      },
      {
        id: 'event-002',
        timestamp: '2024-10-01T10:00:00Z',
        type: 'session_start',
        title: 'セッション開始',
        description: 'Participant A の最初のセッションが開始されました。',
        participantId: 'participant-001',
        participantName: 'Participant A',
        sessionId: 'session-001'
      },
      {
        id: 'event-003',
        timestamp: '2024-10-01T11:30:00Z',
        type: 'session_end',
        title: 'セッション終了',
        description: 'Participant A の最初のセッションが終了しました。',
        participantId: 'participant-001',
        participantName: 'Participant A',
        sessionId: 'session-001'
      },
      {
        id: 'event-004',
        timestamp: '2024-10-02T14:00:00Z',
        type: 'session_start',
        title: 'セッション開始',
        description: 'Participant B のセッションが開始されました。',
        participantId: 'participant-002',
        participantName: 'Participant B',
        sessionId: 'session-002'
      },
      {
        id: 'event-005',
        timestamp: '2024-10-16T16:00:00Z',
        type: 'analysis_complete',
        title: '分析完了',
        description: '実験の分析が完了し、結果が生成されました。',
      }
    ]
  } catch (error) {
    console.error('Failed to get experiment timeline:', error)
    return []
  }
}
