import { createNeo4jClient } from './neo4j'
import { getQueryOptimizer } from './query-optimizer'

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
    const queryOptimizer = getQueryOptimizer()
    
    // 最適化されたクエリで実験データを取得（キャッシュ付き）
    const query = `
      MATCH (e:Experiment)
      OPTIONAL MATCH (e)-[:HAS_SESSION]->(s:ExperimentSession)
      OPTIONAL MATCH (s)-[:HAS_RESPONSE]->(r:Response)
      WITH e, 
           count(DISTINCT s) as sessionCount,
           count(r) as responseCount,
           avg(r.spirit_probability) as avgSpirit
      RETURN e.id as id,
             e.experiment_name as name,
             e.description as description,
             e.status as status,
             e.start_date as createdAt,
             e.end_date as updatedAt,
             sessionCount,
             responseCount,
             coalesce(avgSpirit, 0.5) as averageSpiritProbability
      ORDER BY e.start_date DESC
    `
    
    const experiments = await queryOptimizer.executeWithCache(query, {}, 300000) // 5分キャッシュ
    
    return experiments.map((experiment: any) => ({
      id: experiment.id,
      name: experiment.name || `Experiment ${experiment.id.slice(0, 8)}`,
      description: experiment.description,
      participantCount: 0, // TODO: 参加者数を計算
      sessionCount: experiment.sessionCount || 0,
      averageSpiritProbability: experiment.averageSpiritProbability || 0.5,
      createdAt: experiment.createdAt || new Date().toISOString(),
      updatedAt: experiment.updatedAt || new Date().toISOString(),
      status: (experiment.status || 'active') as 'active' | 'completed' | 'draft'
    }))
  } catch (error) {
    console.error('Failed to fetch all experiments:', error)
    return []
  }
}

export async function getExperimentDetail(experimentId: string): Promise<ExperimentData | null> {
  try {
    const client = createNeo4jClient()
    
    // Neogmaを使って実験詳細を取得
    const experiment = await client.getExperimentDetails(experimentId)
    
    if (!experiment) {
      return null
    }
    
    return {
      id: experiment.id,
      name: experiment.experiment_name || `Experiment ${experiment.id.slice(0, 8)}`,
      description: experiment.description,
      participantCount: 0, // TODO: 参加者数を計算
      sessionCount: experiment.session_count || 0,
      averageSpiritProbability: experiment.average_spirit_probability || 0.5,
      createdAt: experiment.start_date || experiment.created_at || new Date().toISOString(),
      updatedAt: experiment.end_date || experiment.created_at || new Date().toISOString(),
      status: (experiment.status || 'active') as 'active' | 'completed' | 'draft'
    }
  } catch (error) {
    console.error('Failed to get experiment detail:', error)
    return null
  }
}

export async function getExperimentSessions(experimentId: string): Promise<ExperimentSessionData[]> {
  try {
    const client = createNeo4jClient()
    
    // Neogmaを使って実験セッションを取得
    const sessions = await client.getExperimentSessions(experimentId)
    
    return sessions.map((session: any) => ({
      id: session.id,
      sessionType: session.session_type || 'Word Association Test',
      startTime: session.start_ts || new Date().toISOString(),
      endTime: session.end_ts,
      participantId: session.participant_id,
      participantName: `Participant ${session.participant_id?.slice(0, 8) || 'Unknown'}`,
      responseCount: session.response_count || 0,
      averageSpiritProbability: session.average_spirit_probability || 0.5,
      status: (session.status || 'completed') as 'completed' | 'in_progress' | 'failed'
    }))
  } catch (error) {
    console.error('Failed to get experiment sessions:', error)
    return []
  }
}

export async function getExperimentParticipants(experimentId: string): Promise<ExperimentParticipantData[]> {
  try {
    const client = createNeo4jClient()
    
    // Neogmaを使って実験参加者を取得
    const participants = await client.getExperimentParticipants(experimentId)
    
    return participants.map((participant: any) => ({
      id: participant.id,
      name: participant.name || `Participant ${participant.id.slice(0, 8)}`,
      sessionCount: participant.sessionCount || 0,
      responseCount: participant.responseCount || 0,
      averageSpiritProbability: participant.averageSpiritProbability || 0.5,
      lastActivity: participant.lastActivity
    }))
  } catch (error) {
    console.error('Failed to get experiment participants:', error)
    return []
  }
}

export async function getExperimentAnalysis(experimentId: string): Promise<ExperimentAnalysisData | null> {
  try {
    const client = createNeo4jClient()
    
    // Neo4jクエリで実験分析データを取得
    const statsQuery = `
      MATCH (e:Experiment {id: $experimentId})-[:HAS_SESSION]->(s:ExperimentSession)
      OPTIONAL MATCH (s)<-[:PARTICIPATES_IN]-(p:Participant)
      OPTIONAL MATCH (s)-[:HAS_RESPONSE]->(r:Response)
      WITH count(DISTINCT p) as totalParticipants,
           count(DISTINCT s) as totalSessions,
           count(r) as totalResponses,
           avg(r.spirit_probability) as avgSpirit
      RETURN totalParticipants, totalSessions, totalResponses, coalesce(avgSpirit, 0.5) as averageSpiritProbability
    `
    
    const spiritDistQuery = `
      MATCH (e:Experiment {id: $experimentId})-[:HAS_SESSION]->(s:ExperimentSession)-[:HAS_RESPONSE]->(r:Response)
      WHERE r.spirit_probability IS NOT NULL
      WITH r.spirit_probability as prob
      RETURN 
        sum(CASE WHEN prob >= 0.8 THEN 1 ELSE 0 END) as high,
        sum(CASE WHEN prob >= 0.6 AND prob < 0.8 THEN 1 ELSE 0 END) as medium,
        sum(CASE WHEN prob < 0.6 THEN 1 ELSE 0 END) as low
    `
    
    const emotionsQuery = `
      MATCH (e:Experiment {id: $experimentId})-[:HAS_SESSION]->(s:ExperimentSession)-[:HAS_RESPONSE]->(r:Response)
      WHERE r.emotion IS NOT NULL
      WITH r.emotion as emotion, r.emotion_confidence as confidence
      RETURN emotion, count(*) as frequency, avg(confidence) as averageIntensity
      ORDER BY frequency DESC
      LIMIT 10
    `
    
    const wordInsightsQuery = `
      MATCH (e:Experiment {id: $experimentId})-[:HAS_SESSION]->(s:ExperimentSession)-[:HAS_RESPONSE]->(r:Response)
      WHERE r.stimulus_word IS NOT NULL AND r.reaction_time_ms IS NOT NULL AND r.spirit_probability IS NOT NULL
      WITH r.stimulus_word as word, 
           avg(r.reaction_time_ms) as avgTime,
           avg(r.spirit_probability) as avgSpirit
      RETURN word, avgTime/1000.0 as averageResponseTime, avgSpirit as spiritCorrelation
      ORDER BY avgSpirit DESC
      LIMIT 10
    `
    
    const [statsResults, spiritDistResults, emotionsResults, wordInsightsResults] = await Promise.all([
      client.query(statsQuery, { experimentId }),
      client.query(spiritDistQuery, { experimentId }),
      client.query(emotionsQuery, { experimentId }),
      client.query(wordInsightsQuery, { experimentId })
    ])
    
    const stats = statsResults[0] || {}
    const spiritDist = spiritDistResults[0] || { high: 0, medium: 0, low: 0 }
    
    return {
      experimentId,
      totalParticipants: stats.totalParticipants || 0,
      totalSessions: stats.totalSessions || 0,
      totalResponses: stats.totalResponses || 0,
      averageSpiritProbability: stats.averageSpiritProbability || 0.5,
      spiritProbabilityDistribution: {
        high: spiritDist.high || 0,
        medium: spiritDist.medium || 0,
        low: spiritDist.low || 0
      },
      topEmotions: emotionsResults.map((record: any) => ({
        emotion: record.emotion,
        frequency: record.frequency / (stats.totalResponses || 1),
        averageIntensity: record.averageIntensity || 0
      })),
      wordAssociationInsights: wordInsightsResults.map((record: any) => ({
        word: record.word,
        averageResponseTime: record.averageResponseTime || 0,
        spiritCorrelation: record.spiritCorrelation || 0
      }))
    }
  } catch (error) {
    console.error('Failed to get experiment analysis:', error)
    return null
  }
}

export async function getExperimentTimeline(experimentId: string): Promise<ExperimentTimelineEvent[]> {
  try {
    const client = createNeo4jClient()
    
    // Neo4jクエリで実験タイムラインを取得
    const query = `
      MATCH (e:Experiment {id: $experimentId})
      OPTIONAL MATCH (e)-[:HAS_SESSION]->(s:ExperimentSession)
      OPTIONAL MATCH (s)<-[:PARTICIPATES_IN]-(p:Participant)
      WITH e, s, p
      WHERE s IS NOT NULL
      RETURN 
        s.id as sessionId,
        s.start_ts as startTime,
        s.end_ts as endTime,
        s.status as status,
        p.id as participantId,
        p.participant_id as participantName
      ORDER BY s.start_ts ASC
    `
    
    const results = await client.query(query, { experimentId })
    
    const events: ExperimentTimelineEvent[] = []
    
    // セッション開始・終了イベントを生成
    results.forEach((record: any, index: number) => {
      if (record.startTime) {
        events.push({
          id: `session-start-${record.sessionId}`,
          timestamp: record.startTime,
          type: 'session_start',
          title: 'セッション開始',
          description: `${record.participantName || 'Unknown'} のセッションが開始されました。`,
          participantId: record.participantId,
          participantName: record.participantName,
          sessionId: record.sessionId
        })
      }
      
      if (record.endTime) {
        events.push({
          id: `session-end-${record.sessionId}`,
          timestamp: record.endTime,
          type: 'session_end',
          title: 'セッション終了',
          description: `${record.participantName || 'Unknown'} のセッションが終了しました。`,
          participantId: record.participantId,
          participantName: record.participantName,
          sessionId: record.sessionId
        })
      }
    })
    
    // 分析完了イベントを追加（最新のセッション終了時刻）
    if (events.length > 0) {
      const lastEvent = events[events.length - 1]
      events.push({
        id: `analysis-complete-${experimentId}`,
        timestamp: new Date().toISOString(),
        type: 'analysis_complete',
        title: '分析完了',
        description: '実験の分析が完了し、結果が生成されました。',
      })
    }
    
    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  } catch (error) {
    console.error('Failed to get experiment timeline:', error)
    return []
  }
}
