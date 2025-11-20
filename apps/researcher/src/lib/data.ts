<<<<<<< HEAD
// Neo4jの直接使用を削除し、GraphQL経由のみに変更
// import { createNeo4jClient } from './neo4j'

// Use generated types from GraphQL Code Generator
import type {
  Participant as GraphQLParticipant,
  Session as GraphQLSession,
  TimelinePoint as GraphQLTimelinePoint,
  GetParticipantsQueryResult,
  GetSessionsQueryResult,
  GetTimelineQueryResult,
} from '@/generated/graphql';
=======
import { createNeo4jClient } from './neo4j'
>>>>>>> origin/main

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
<<<<<<< HEAD
  lastActivity?: number | null
=======
>>>>>>> origin/main
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

<<<<<<< HEAD
// Server-side data fetching functions - GraphQL経由のみ
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // GraphQL経由でデータを取得
    const { graphqlClient, GetParticipantsDocument, GetSessionsDocument, GetTimelineDocument } = await import('./graphql/client')

    // 参加者一覧を取得
    const participantsData = await graphqlClient.request<GetParticipantsQueryResult>(GetParticipantsDocument)
    const participants = participantsData.participants || []
    const totalParticipants = participants.length

    // 全参加者のセッションとタイムラインデータを取得して統計を計算
    let totalSessions = 0
    let totalResponses = 0
    const emotionDistribution: Record<string, number> = {}
    const reactionValues: number[] = []
    const components: Array<{ word2vec: number; reaction_time: number; skin_potential: number; emotion: number }> = []

    for (const participant of participants) {
      try {
        // セッションを取得
        const sessionsData = await graphqlClient.request<GetSessionsQueryResult>(GetSessionsDocument, { participantId: participant.id })
        const sessions = sessionsData.sessions || []
        totalSessions += sessions.length

        // タイムラインデータを取得
        const timelineData = await graphqlClient.request<GetTimelineQueryResult>(GetTimelineDocument, { participantId: participant.id })
        const timeline = timelineData.timeline || []
        
        // レスポンス数をカウント
        const responses = timeline.filter(p => p.hasResponse)
        totalResponses += responses.length

        // 感情データを集計
        timeline.forEach(point => {
          if (Array.isArray(point.emotions)) {
            point.emotions.forEach(emotion => {
              const emotionName = emotion.name || 'unknown'
              emotionDistribution[emotionName] = (emotionDistribution[emotionName] || 0) + 1
            })
      }
    })

        // 反応値とコンポーネントを収集
        timeline.forEach(point => {
          if (point.reactionValue != null) {
            reactionValues.push(point.reactionValue)
          }
          // コンポーネントはタイムラインデータからは取得できないため、デフォルト値を使用
          components.push({
            word2vec: 0,
            reaction_time: point.reactionTime ? 10 / (1 + point.reactionTime / 1000) : 0,
            skin_potential: 0,
            emotion: Array.isArray(point.emotions) && point.emotions.length > 0
              ? point.emotions.reduce((sum, e) => sum + (e.score || 0), 0) / point.emotions.length
              : 0
          })
        })
      } catch (error) {
        console.error(`Failed to fetch data for participant ${participant.id}:`, error)
      }
    }

    // 平均Spirit確率を計算（reactionValueをspirit確率として扱う）
    const averageSpiritProbability = reactionValues.length > 0
      ? reactionValues.reduce((sum, val) => sum + val, 0) / reactionValues.length
      : 0

    // コンポーネントの平均を計算
    const componentAverages = components.length > 0 ? {
      word2vec: components.reduce((sum, c) => sum + c.word2vec, 0) / components.length,
      reaction_time: components.reduce((sum, c) => sum + c.reaction_time, 0) / components.length,
      skin_potential: components.reduce((sum, c) => sum + c.skin_potential, 0) / components.length,
      emotion: components.reduce((sum, c) => sum + c.emotion, 0) / components.length,
    } : {
      word2vec: 0,
      reaction_time: 0,
      skin_potential: 0,
      emotion: 0,
=======
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
>>>>>>> origin/main
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
<<<<<<< HEAD
    // Use GraphQL to fetch participants
    const { graphqlClient, GetParticipantsDocument, GetSessionsDocument, GetTimelineDocument } = await import('./graphql/client')
    
    console.log('[getAllParticipants] Fetching participants from GraphQL...')
    let participantsData: GetParticipantsQueryResult
    try {
      participantsData = await graphqlClient.request<GetParticipantsQueryResult>(GetParticipantsDocument)
    } catch (error) {
      console.error('[getAllParticipants] Failed to fetch participants:', error)
      if (error instanceof Error) {
        console.error('[getAllParticipants] Error message:', error.message)
        console.error('[getAllParticipants] Error stack:', error.stack)
      }
      throw error
    }
    
    const participants = participantsData.participants || []
    console.log(`[getAllParticipants] Found ${participants.length} participants`)

    // For each participant, get detailed data including statistics
    const participantsWithData = await Promise.all(
      participants.map(async (participant) => {
        const participantId = participant.id
        
        try {
          console.log(`[getAllParticipants] Fetching data for participant ${participantId}...`)
          
          // Get sessions for this participant
          let sessionsData: GetSessionsQueryResult
          try {
            sessionsData = await graphqlClient.request<GetSessionsQueryResult>(GetSessionsDocument, { participantId })
          } catch (error) {
            console.error(`[getAllParticipants] Failed to fetch sessions for ${participantId}:`, error)
            if (error instanceof Error) {
              console.error(`[getAllParticipants] Error message:`, error.message)
            }
            throw error
          }
          const sessions = sessionsData.sessions || []
          console.log(`[getAllParticipants] Found ${sessions.length} sessions for participant ${participantId}`)
          
          // Get timeline data to calculate response count and average spirit probability
          let timelineData: GetTimelineQueryResult
          try {
            timelineData = await graphqlClient.request<GetTimelineQueryResult>(GetTimelineDocument, { participantId })
          } catch (error) {
            console.error(`[getAllParticipants] Failed to fetch timeline for ${participantId}:`, error)
            if (error instanceof Error) {
              console.error(`[getAllParticipants] Error message:`, error.message)
            }
            throw error
          }
          const timeline = timelineData.timeline || []
          console.log(`[getAllParticipants] Found ${timeline.length} timeline points for participant ${participantId}`)
          
          // Calculate statistics
          const responseCount = timeline.filter((p) => p.hasResponse).length
          const reactionValues = timeline
            .filter((p) => p.reactionValue != null)
            .map((p) => p.reactionValue ?? 0)
          const averageSpiritProbability = reactionValues.length > 0
            ? reactionValues.reduce((sum, val) => sum + val, 0) / reactionValues.length
            : 0
          
          console.log(`[getAllParticipants] Participant ${participantId} stats:`, {
            sessionCount: sessions.length,
            responseCount,
            averageSpiritProbability,
            timelineLength: timeline.length
          })
          
          // Get last activity timestamp
          const lastActivity = timeline.length > 0
            ? new Date(timeline[timeline.length - 1].time).getTime()
            : null
          
          return {
            id: participantId,
            name: `Participant ${participantId.slice(0, 8)}`,
            sessions: sessions.map((s) => ({
              id: s.id,
              session_id: s.id,
              session_type: 'experiment',
              start_time: s.startTs ? new Date(s.startTs).toISOString() : null,
              end_time: s.endTs ? new Date(s.endTs).toISOString() : null,
              responses: [],
              responseCount: timeline.filter((p) => p.sessionId === s.id && p.hasResponse).length,
            })),
            analysisRuns: [],
            sessionCount: sessions.length,
            responseCount,
            averageSpiritProbability,
            lastActivity,
          } as ParticipantData
        } catch (error) {
          console.error(`[getAllParticipants] Failed to fetch data for participant ${participantId}:`, error)
          if (error instanceof Error) {
            console.error(`[getAllParticipants] Error message:`, error.message)
            console.error(`[getAllParticipants] Error stack:`, error.stack)
          }
          // Return participant with zero stats instead of throwing
          return {
            id: participantId,
            name: `Participant ${participantId.slice(0, 8)}`,
            sessions: [],
            analysisRuns: [],
            sessionCount: 0,
            responseCount: 0,
            averageSpiritProbability: 0,
            lastActivity: null,
          } as ParticipantData
=======
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
>>>>>>> origin/main
        }
      })
    )

<<<<<<< HEAD
    const validParticipants = participantsWithData.filter(Boolean) as ParticipantData[]
    console.log(`[getAllParticipants] Returning ${validParticipants.length} participants with data`)
    return validParticipants
  } catch (error) {
    console.error('[getAllParticipants] Failed to fetch all participants:', error)
    if (error instanceof Error) {
      console.error('[getAllParticipants] Error message:', error.message)
      console.error('[getAllParticipants] Error stack:', error.stack)
    }
    // Return empty array instead of throwing to prevent API route from crashing
=======
    return participantsWithData.filter(Boolean) as ParticipantData[]
  } catch (error) {
    console.error('Failed to fetch all participants:', error)
>>>>>>> origin/main
    return []
  }
}

export async function getParticipantData(participantId: string): Promise<ParticipantData | null> {
  try {
<<<<<<< HEAD
    // GraphQL経由でデータを取得
    const { graphqlClient, GetParticipantsDocument, GetSessionsDocument, GetTimelineDocument } = await import('./graphql/client')

    // 参加者情報を取得（GetParticipantがない場合はGetParticipantsから検索）
    const participantsData = await graphqlClient.request<GetParticipantsQueryResult>(GetParticipantsDocument)
    const participant = participantsData.participants?.find(p => p.id === participantId)
    if (!participant) return null

    // セッションを取得
    const sessionsData = await graphqlClient.request<GetSessionsQueryResult>(GetSessionsDocument, { participantId })
    const sessions = sessionsData.sessions || []

    // タイムラインデータを取得してレスポンスを構築
    const timelineData = await graphqlClient.request<GetTimelineQueryResult>(GetTimelineDocument, { participantId })
    const timeline = timelineData.timeline || []

    // セッションごとにレスポンスをグループ化
    const sessionMap: Record<string, ResponseData[]> = {}
    timeline.forEach(point => {
      if (point.hasResponse && point.sessionId) {
        const sessionId = point.sessionId
      if (!sessionMap[sessionId]) {
        sessionMap[sessionId] = []
      }
        
        // 感情データから主要な感情を取得
        const primaryEmotion = Array.isArray(point.emotions) && point.emotions.length > 0
          ? point.emotions[0]
          : null

      sessionMap[sessionId].push({
          id: `${point.sessionId}-${point.time}`,
          stimulus_word: point.word || '',
          response_word: point.word || '', // タイムラインデータからは応答語が取得できないため、刺激語を使用
          reaction_time_ms: point.reactionTime || 0,
          skin_potential: 0, // 生理データは別途取得が必要
          emotion: primaryEmotion?.name || '',
          emotion_confidence: primaryEmotion?.score || 0,
          skinPotentialTimeseries: [],
          emotionTimeseries: []
      })
      }
    })

    // セッション配列を作成
    const experimentSessions: ExperimentSession[] = sessions.map(session => {
      const sessionId = session.id
=======
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
>>>>>>> origin/main
      const sessionResponses = sessionMap[sessionId] || []

      return {
        id: sessionId,
        session_id: sessionId,
<<<<<<< HEAD
        session_type: 'experiment',
        start_time: session.startTs ? new Date(session.startTs).toISOString() : null,
        end_time: session.endTs ? new Date(session.endTs).toISOString() : null,
=======
        session_type: 'word_association', // 固定値として設定
        start_time: dbSession.start_ts || null,
        end_time: dbSession.end_ts || null,
>>>>>>> origin/main
        responses: sessionResponses,
        responseCount: sessionResponses.length,
      }
    })

<<<<<<< HEAD
    // 分析結果を作成
    const responses = timeline.filter(p => p.hasResponse)
=======
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
>>>>>>> origin/main
    const analysisRuns: AnalysisRun[] = [{
      id: 'latest',
      run_id: 'latest',
      status: 'completed',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
<<<<<<< HEAD
      results: responses.map((point, index) => {
        const primaryEmotion = Array.isArray(point.emotions) && point.emotions.length > 0
          ? point.emotions[0]
          : null
        
        return {
          id: `${participantId}-${index}`,
          stimulus_word: point.word || '',
          response_word: point.word || '',
          p_value: point.reactionValue || 0.5,
          word2vec_component: 0,
          reaction_time_component: point.reactionTime ? 10 / (1 + point.reactionTime / 1000) : 0,
          skin_potential_component: 0,
          emotion_component: primaryEmotion?.score || 0,
          emotion_data: primaryEmotion ? { [primaryEmotion.name || 'unknown']: primaryEmotion.score || 0 } : {},
          physiological_data: {},
          created_at: typeof point.time === 'string' ? point.time : new Date(point.time).toISOString(),
          reaction_time_ms: point.reactionTime || undefined,
        }
      })
    }]

    const sessionCount = experimentSessions.length
    const responseCount = responses.length
    const reactionValues = responses
      .filter(p => p.reactionValue != null)
      .map(p => p.reactionValue ?? 0)
    const averageSpiritProbability = reactionValues.length > 0
      ? reactionValues.reduce((sum, val) => sum + val, 0) / reactionValues.length
=======
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
>>>>>>> origin/main
      : 0

    return {
      id: participant.id,
<<<<<<< HEAD
      name: `Participant ${participantId.slice(0, 8)}`,
      sessions: experimentSessions,
=======
      name: `Participant ${participantId.slice(0, 8)}`, // デフォルト名
      sessions,
>>>>>>> origin/main
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
<<<<<<< HEAD
  try {
    // GraphQL経由でタイムラインデータを取得
    // responseIdからparticipantIdとsessionIdを抽出（形式: "sessionId-timestamp" または単純なID）
    // 現時点では、GraphQLサービス側でresponseIdベースのクエリが実装されていないため、
    // タイムラインデータから該当するレスポンスを検索する
    
    // 注意: responseIdの形式に依存するため、実装は簡易版とする
    // 完全な実装には、GraphQLサービス側にresponseIdベースのクエリが必要
    
    console.warn('getResponseTimeseries: GraphQL経由での実装は未対応。空データを返します。', responseId)
    
      return {
        skinPotential: [],
        emotions: []
    }
  } catch (error) {
    console.error('Failed to get response timeseries:', error)
    return {
      skinPotential: [],
      emotions: []
    }
=======
  // Placeholder implementation for TerminusDB
  // TODO: Implement proper timeseries data retrieval from TerminusDB
  console.log('Getting timeseries data for response:', responseId)

  return {
    skinPotential: [], // Placeholder
    emotions: [] // Placeholder
>>>>>>> origin/main
  }
}

export async function getAnalysisResults(participantId?: string): Promise<AnalysisResult[]> {
  try {
<<<<<<< HEAD
=======
    // For now, return mock analysis results since we don't have analysis results in TerminusDB yet
    // In the future, this should query actual analysis results from TerminusDB

>>>>>>> origin/main
    if (participantId) {
      return getAnalysisResultsForParticipant(participantId)
    }

<<<<<<< HEAD
    // 全参加者のタイムラインデータを取得して分析結果を生成
    const { graphqlClient, GetParticipantsDocument, GetTimelineDocument } = await import('./graphql/client')
    
    const participantsData = await graphqlClient.request<GetParticipantsQueryResult>(GetParticipantsDocument)
    const participants = participantsData.participants || []
    
    const allResults: AnalysisResult[] = []
    
    for (const participant of participants) {
      try {
        const timelineData = await graphqlClient.request<GetTimelineQueryResult>(GetTimelineDocument, { participantId: participant.id })
        const timeline = timelineData.timeline || []
        
        const participantResults = timeline
          .filter(p => p.hasResponse)
          .map((point, index) => {
            const primaryEmotion = Array.isArray(point.emotions) && point.emotions.length > 0
              ? point.emotions[0]
              : null
            
            return {
              id: `${participant.id}-${index}`,
              stimulus_word: point.word || '',
              response_word: point.word || '',
              p_value: point.reactionValue || 0.5,
              word2vec_component: 0,
              reaction_time_component: point.reactionTime ? 10 / (1 + point.reactionTime / 1000) : 0,
              skin_potential_component: 0,
              emotion_component: primaryEmotion?.score || 0,
              emotion_data: primaryEmotion ? { [primaryEmotion.name || 'unknown']: primaryEmotion.score || 0 } : {},
              physiological_data: {},
              created_at: typeof point.time === 'string' ? point.time : new Date(point.time).toISOString(),
              reaction_time_ms: point.reactionTime || undefined,
            }
          })
        
        allResults.push(...participantResults)
      } catch (error) {
        console.error(`Failed to fetch analysis results for participant ${participant.id}:`, error)
      }
    }
    
    return allResults.sort((a, b) => {
      const aTime = new Date(a.created_at).getTime()
      const bTime = new Date(b.created_at).getTime()
      return bTime - aTime // 新しい順
    })
=======
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
>>>>>>> origin/main
  } catch (error) {
    console.error('Failed to get analysis results:', error)
    return []
  }
}

export async function getAnalysisResultsForParticipant(participantId: string): Promise<AnalysisResult[]> {
  try {
<<<<<<< HEAD
    // GraphQL経由でタイムラインデータを取得
    const { graphqlClient, GetTimelineDocument } = await import('./graphql/client')
    
    const timelineData = await graphqlClient.request<GetTimelineQueryResult>(GetTimelineDocument, { participantId })
    const timeline = timelineData.timeline || []
    
    // レスポンスがあるポイントから分析結果を生成
    return timeline
      .filter(p => p.hasResponse)
      .map((point, index) => {
        const primaryEmotion = Array.isArray(point.emotions) && point.emotions.length > 0
          ? point.emotions[0]
          : null
        
        return {
          id: `${participantId}-${index}`,
          stimulus_word: point.word || '',
          response_word: point.word || '',
          p_value: point.reactionValue || 0.5,
          word2vec_component: 0,
          reaction_time_component: point.reactionTime ? 10 / (1 + point.reactionTime / 1000) : 0,
          skin_potential_component: 0,
          emotion_component: primaryEmotion?.score || 0,
          emotion_data: primaryEmotion ? { [primaryEmotion.name || 'unknown']: primaryEmotion.score || 0 } : {},
          physiological_data: {},
          created_at: typeof point.time === 'string' ? point.time : new Date(point.time).toISOString(),
          reaction_time_ms: point.reactionTime || undefined,
        }
      })
=======
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
>>>>>>> origin/main
  } catch (error) {
    console.error('Failed to get analysis results for participant:', error)
    return []
  }
}
