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
  lastActivity?: number | null
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
    // Use GraphQL to fetch participants
    const { graphqlClient, GetParticipantsDocument, GetSessionsDocument, GetTimelineDocument } = await import('./graphql/client')
    
    const participantsData = await graphqlClient.request<GetParticipantsQueryResult>(GetParticipantsDocument)
    const participants = participantsData.participants || []

    // For each participant, get detailed data including statistics
    const participantsWithData = await Promise.all(
      participants.map(async (participant) => {
        const participantId = participant.id
        
        try {
          // Get sessions for this participant
          const sessionsData = await graphqlClient.request<GetSessionsQueryResult>(GetSessionsDocument, { participantId })
          const sessions = sessionsData.sessions || []
          
          // Get timeline data to calculate response count and average spirit probability
          const timelineData = await graphqlClient.request<GetTimelineQueryResult>(GetTimelineDocument, { participantId })
          const timeline = timelineData.timeline || []
          
          // Calculate statistics
          const responseCount = timeline.filter((p) => p.hasResponse).length
          const reactionValues = timeline
            .filter((p) => p.reactionValue != null)
            .map((p) => p.reactionValue ?? 0)
          const averageSpiritProbability = reactionValues.length > 0
            ? reactionValues.reduce((sum, val) => sum + val, 0) / reactionValues.length
            : 0
          
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
          console.error(`Failed to fetch data for participant ${participantId}:`, error)
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
      const sessionResponses = sessionMap[sessionId] || []

      return {
        id: sessionId,
        session_id: sessionId,
        session_type: 'experiment',
        start_time: session.startTs ? new Date(session.startTs).toISOString() : null,
        end_time: session.endTs ? new Date(session.endTs).toISOString() : null,
        responses: sessionResponses,
        responseCount: sessionResponses.length,
      }
    })

    // 分析結果を作成
    const responses = timeline.filter(p => p.hasResponse)
    const analysisRuns: AnalysisRun[] = [{
      id: 'latest',
      run_id: 'latest',
      status: 'completed',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
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
      : 0

    return {
      id: participant.id,
      name: `Participant ${participantId.slice(0, 8)}`,
      sessions: experimentSessions,
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
  }
}

export async function getAnalysisResults(participantId?: string): Promise<AnalysisResult[]> {
  try {
    if (participantId) {
      return getAnalysisResultsForParticipant(participantId)
    }

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
  } catch (error) {
    console.error('Failed to get analysis results:', error)
    return []
  }
}

export async function getAnalysisResultsForParticipant(participantId: string): Promise<AnalysisResult[]> {
  try {
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
  } catch (error) {
    console.error('Failed to get analysis results for participant:', error)
    return []
  }
}
