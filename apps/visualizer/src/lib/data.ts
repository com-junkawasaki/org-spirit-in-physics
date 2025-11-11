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

// Server-side data fetching functions - Neo4jベース
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

    // Cypherクエリを使ってデータを取得
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
      : 0

    // コンポーネントの平均を計算
    const componentAverages = responsesWithComponents.length > 0 ? {
      word2vec: responsesWithComponents.reduce((sum, r) => sum + (r.word2vec_component || 0), 0) / responsesWithComponents.length,
      reaction_time: responsesWithComponents.reduce((sum, r) => sum + (r.reaction_time_component || 0), 0) / responsesWithComponents.length,
      skin_potential: responsesWithComponents.reduce((sum, r) => sum + (r.skin_potential_component || 0), 0) / responsesWithComponents.length,
      emotion: responsesWithComponents.reduce((sum, r) => sum + (r.emotion_component || 0), 0) / responsesWithComponents.length,
    } : {
      word2vec: 0,
      reaction_time: 0,
      skin_potential: 0,
      emotion: 0,
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

    // セッションを取得（新しい構造: Participant -> Session）
    let sessionsQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
      RETURN s.id as id, s.session_index as sessionIndex, s.created_at as createdAt,
             s.start_ts as startTs, s.end_ts as endTs, s.participant_id as participant_id
      ORDER BY s.created_at DESC
    `
    let sessionsResult = await client.query(sessionsQuery, { participantId })
    
    // 新しい構造でデータが見つからない場合、古い構造を試す
    if (sessionsResult.length === 0) {
      sessionsQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession)
        RETURN s.id as id, s.session_index as sessionIndex, s.created_at as createdAt,
               s.start_ts as startTs, s.end_ts as endTs, s.participant_id as participant_id,
               s.status as status, s.total_responses as total_responses,
               s.completed_responses as completed_responses
        ORDER BY s.start_ts DESC
      `
      sessionsResult = await client.query(sessionsQuery, { participantId })
    }
    
    const dbSessions = sessionsResult?.map((record: any) => ({
      id: record.id,
      participant_id: record.participant_id,
      start_ts: record.startTs || record.start_ts,
      end_ts: record.endTs || record.end_ts,
      status: record.status || 'completed',
      total_responses: record.total_responses || 0,
      completed_responses: record.completed_responses || 0,
      created_at: record.createdAt || record.created_at,
      session_index: record.sessionIndex || record.session_index,
    })) || []

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
  try {
    const client = createNeo4jClient()

    // レスポンスに関連するセッションと参加者を取得
    const responseQuery = `
      MATCH (r:Response {id: $responseId})
      OPTIONAL MATCH (s:Session)-[:HAS_RESPONSE]->(r)
      OPTIONAL MATCH (p:Participant)-[:HAS_SESSION]->(s)
      RETURN r.event_ts as responseTimestamp, s.id as sessionId, p.id as participantId
      UNION
      MATCH (r:Response {id: $responseId})
      OPTIONAL MATCH (s:ExperimentSession)-[:HAS_RESPONSE]->(r)
      OPTIONAL MATCH (e:Experiment)-[:HAS_SESSION]->(s)
      OPTIONAL MATCH (p:Participant)-[:HAS_EXPERIMENT]->(e)
      RETURN r.event_ts as responseTimestamp, s.id as sessionId, p.id as participantId
    `
    const responseResult = await client.query(responseQuery, { responseId })

    if (responseResult.length === 0) {
      console.warn('Response not found:', responseId)
      return {
        skinPotential: [],
        emotions: []
      }
    }

    const sessionId = responseResult[0].sessionId
    const participantId = responseResult[0].participantId
    const responseTimestamp = responseResult[0].responseTimestamp || 0

    if (!sessionId || !participantId) {
      console.warn('Session or participant not found for response:', responseId)
      return {
        skinPotential: [],
        emotions: []
      }
    }

    // セッションデータを取得してレスポンスの時間範囲を特定
    const sessionQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})
      RETURN s.start_ts as startTs, s.end_ts as endTs
      UNION
      MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession {id: $sessionId})
      RETURN s.start_ts as startTs, s.end_ts as endTs
    `
    const sessionResult = await client.query(sessionQuery, { participantId, sessionId })
    const sessionStartTs = sessionResult[0]?.startTs || responseTimestamp

    // 感情データを取得（レスポンスの前後30秒）
    const emotionQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})
      MATCH (s)-[:HAS_EMOTION_ANALYSIS]->(ea:EmotionAnalysis)
      WHERE ea.begin_time >= ($responseTimestamp - 30000) AND ea.begin_time <= ($responseTimestamp + 30000)
      RETURN ea.emotion_scores as emotionScores, ea.begin_time as beginTime, 
             ea.end_time as endTime, ea.file_type as fileType, ea.confidence as confidence
      ORDER BY ea.begin_time
      UNION
      MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession {id: $sessionId})
      MATCH (s)-[:HAS_EMOTION_ANALYSIS]->(ea:EmotionAnalysis)
      WHERE ea.begin_time >= ($responseTimestamp - 30000) AND ea.begin_time <= ($responseTimestamp + 30000)
      RETURN ea.emotion_scores as emotionScores, ea.begin_time as beginTime,
             ea.end_time as endTime, ea.file_type as fileType, ea.confidence as confidence
      ORDER BY ea.begin_time
    `
    const emotionResults = await client.query(emotionQuery, { 
      participantId, 
      sessionId, 
      responseTimestamp: typeof responseTimestamp === 'object' && 'low' in responseTimestamp 
        ? responseTimestamp.low 
        : Number(responseTimestamp) 
    })

    // 生理データを取得（レスポンスの前後30秒）
    const physiologicalQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})
      MATCH (s)-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData)
      WHERE pd.timestamp >= ($responseTimestamp - 30000) AND pd.timestamp <= ($responseTimestamp + 30000)
      RETURN pd.timestamp as timestamp, pd.ch1 as ch1, pd.ch2 as ch2, pd.ch3 as ch3, pd.ch4 as ch4,
             pd.ch5 as ch5, pd.ch6 as ch6, pd.ch7 as ch7, pd.ch8 as ch8
      ORDER BY pd.timestamp
      UNION
      MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession {id: $sessionId})
      MATCH (s)-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData)
      WHERE pd.timestamp >= ($responseTimestamp - 30000) AND pd.timestamp <= ($responseTimestamp + 30000)
      RETURN pd.timestamp as timestamp, pd.ch1 as ch1, pd.ch2 as ch2, pd.ch3 as ch3, pd.ch4 as ch4,
             pd.ch5 as ch5, pd.ch6 as ch6, pd.ch7 as ch7, pd.ch8 as ch8
      ORDER BY pd.timestamp
    `
    const physiologicalResults = await client.query(physiologicalQuery, {
      participantId,
      sessionId,
      responseTimestamp: typeof responseTimestamp === 'object' && 'low' in responseTimestamp
        ? responseTimestamp.low
        : Number(responseTimestamp)
    })

    // データを変換
    const toNumber = (value: any): number => {
      if (value === null || value === undefined) return 0
      if (typeof value === 'object' && value !== null && 'low' in value) {
        return value.low
      }
      return Number(value) || 0
    }

    // 生理データをSkinPotentialPoint形式に変換（Ch1を代表値として使用）
    const skinPotential: SkinPotentialPoint[] = physiologicalResults.map((result: any) => {
      const timestamp = toNumber(result.timestamp)
      const value = toNumber(result.ch1) || 0 // Ch1を代表値として使用
      return {
        timestamp_offset_ms: timestamp - (typeof sessionStartTs === 'object' && 'low' in sessionStartTs 
          ? sessionStartTs.low 
          : Number(sessionStartTs)),
        value
      }
    })

    // 感情データをEmotionPoint形式に変換
    const emotions: EmotionPoint[] = []
    emotionResults.forEach((result: any) => {
      const beginTime = toNumber(result.beginTime)
      const endTime = toNumber(result.endTime)
      const confidence = toNumber(result.confidence) || 1.0
      
      let emotionScores: Record<string, number> = {}
      if (result.emotionScores) {
        if (typeof result.emotionScores === 'string') {
          try {
            emotionScores = JSON.parse(result.emotionScores)
          } catch (e) {
            console.warn('Failed to parse emotion scores:', e)
          }
        } else {
          emotionScores = result.emotionScores
        }
      }

      Object.entries(emotionScores).forEach(([emotionType, score]) => {
        if (typeof score === 'number' && score > 0) {
          emotions.push({
            timestamp_offset_ms: beginTime - (typeof sessionStartTs === 'object' && 'low' in sessionStartTs
              ? sessionStartTs.low
              : Number(sessionStartTs)),
            emotion_type: emotionType,
            intensity: score,
            confidence
          })
        }
      })
    })

    return {
      skinPotential,
      emotions
    }
  } catch (error) {
    console.error('Failed to get response timeseries:', error)
    return {
      skinPotential: [],
      emotions: []
    }
  }
}

export async function getAnalysisResults(participantId?: string): Promise<AnalysisResult[]> {
  try {
    if (participantId) {
      return getAnalysisResultsForParticipant(participantId)
    }

    // 全参加者のレスポンスを取得して分析結果を生成
    const client = createNeo4jClient()
    const query = `
      MATCH (p:Participant)-[:HAS_SESSION]->(s:Session)-[:HAS_RESPONSE]->(r:Response)
      RETURN r.id as id, r.stimulus_word as stimulus_word, r.response_word as response_word,
             r.reaction_time_ms as reaction_time_ms, r.emotion as emotion,
             r.emotion_confidence as emotion_confidence, r.spirit_probability as spirit_probability,
             r.event_ts as event_ts, p.id as participant_id
      ORDER BY r.event_ts DESC
    `
    const responses = await client.query(query)

    // 実際のデータに基づいて分析結果を生成
    return responses.map((response, index) => ({
      id: response.id || `analysis-all-${index}`,
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
