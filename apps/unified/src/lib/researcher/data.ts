// @ts-nocheck
// gRPC経由のみに変更

// Use gRPC client instead of GraphQL
import {
  getParticipants,
  getParticipant,
  getSessions,
  getTimeline,
  type GetParticipantsResponse,
  type GetParticipantResponse,
  type GetSessionsResponse,
  type GetTimelineResponse,
} from './grpc/client';

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

// Server-side data fetching functions - gRPC経由のみ
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // gRPC経由でデータを取得

    // 参加者一覧を取得
    const participantsData = await getParticipants()
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
        const sessionsData = await getSessions(participant.id)
        const sessions = sessionsData.sessions || []
        totalSessions += sessions.length

        // タイムラインデータを取得
        const timelineData = await getTimeline({ participantId: participant.id })
        const timeline = timelineData.points || []
        
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
      ? reactionValues.reduce((sum: number, val: number) => sum + val, 0) / reactionValues.length
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
    // Use gRPC to fetch participants
    
    console.log('[getAllParticipants] Fetching participants from gRPC...')
    let participantsData: GetParticipantsResponse
    try {
      participantsData = await getParticipants()
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
          let sessionsData: GetSessionsResponse
          try {
            sessionsData = await getSessions(participantId)
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
          let timelineData: GetTimelineResponse
          try {
            timelineData = await getTimeline({ participantId })
          } catch (error) {
            console.error(`[getAllParticipants] Failed to fetch timeline for ${participantId}:`, error)
            if (error instanceof Error) {
              console.error(`[getAllParticipants] Error message:`, error.message)
            }
            throw error
          }
          const timeline = timelineData.points || []
          
          // Calculate response count
          const responses = timeline.filter(p => p.hasResponse)
          const responseCount = responses.length
          
          // Calculate average spirit probability (using reactionValue)
          const reactionValues = responses
            .map(p => p.reactionValue)
            .filter((v): v is number => v != null)
          const averageSpiritProbability = reactionValues.length > 0
            ? reactionValues.reduce((sum, val) => sum + val, 0) / reactionValues.length
            : 0
          
          // Get last activity timestamp
          const lastActivity = sessions.length > 0 && sessions[0].endTs
            ? Number(sessions[0].endTs)
            : null

          return {
            id: participantId,
            name: null, // GraphQL/gRPC doesn't provide name field
            sessions: sessions.map(s => ({
              id: s.id,
              session_id: s.id,
              session_type: 'experiment',
              start_time: s.startTs ? new Date(Number(s.startTs)).toISOString() : null,
              end_time: s.endTs ? new Date(Number(s.endTs)).toISOString() : null,
              responses: [], // Will be populated from timeline if needed
              responseCount: 0,
            })),
            analysisRuns: [],
            sessionCount: sessions.length,
            responseCount,
            averageSpiritProbability,
            lastActivity,
          }
        } catch (error) {
          console.error(`[getAllParticipants] Failed to process participant ${participantId}:`, error)
          // Return minimal data for this participant
          return {
            id: participantId,
            name: null,
            sessions: [],
            analysisRuns: [],
            sessionCount: 0,
            responseCount: 0,
            averageSpiritProbability: 0,
            lastActivity: null,
          }
        }
      })
    )

    console.log(`[getAllParticipants] Returning ${participantsWithData.length} participants with data`)
    return participantsWithData
  } catch (error) {
    console.error('[getAllParticipants] Failed to get participants:', error)
    if (error instanceof Error) {
      console.error('[getAllParticipants] Error message:', error.message)
      console.error('[getAllParticipants] Error stack:', error.stack)
    }
    return []
  }
}

export async function getParticipantData(participantId: string): Promise<ParticipantData | null> {
  try {
    // gRPC経由でデータを取得

    // 参加者情報を取得
    const participantData = await getParticipant(participantId)
    const participant = participantData.participant
    if (!participant) return null

    // セッションを取得
    const sessionsData = await getSessions(participantId)
    const sessions = sessionsData.sessions || []

    // タイムラインデータを取得してレスポンスを構築
    const timelineData = await getTimeline({ participantId })
    const timeline = timelineData.points || []

    // セッションごとにレスポンスをグループ化
    const sessionMap: Record<string, ResponseData[]> = {}
    timeline.forEach(point => {
      if (point.hasResponse && point.sessionId) {
        if (!sessionMap[point.sessionId]) {
          sessionMap[point.sessionId] = []
        }
        // Convert timeline point to response data
        const response: ResponseData = {
          id: `${point.sessionId}-${point.time}`,
          stimulus_word: point.word || '',
          response_word: '', // Not available in timeline
          reaction_time_ms: point.reactionTime ? Number(point.reactionTime) : 0,
          skin_potential: 0, // Extract from physiological data if available
          emotion: point.emotions && point.emotions.length > 0 ? point.emotions[0].name : '',
          emotion_confidence: point.emotions && point.emotions.length > 0 ? point.emotions[0].score : 0,
        }
        sessionMap[point.sessionId].push(response)
      }
    })

    // Build session data with responses
    const sessionsWithResponses = sessions.map(session => ({
      id: session.id,
      session_id: session.id,
      session_type: 'experiment',
      start_time: session.startTs ? new Date(Number(session.startTs)).toISOString() : null,
      end_time: session.endTs ? new Date(Number(session.endTs)).toISOString() : null,
      responses: sessionMap[session.id] || [],
      responseCount: sessionMap[session.id]?.length || 0,
    }))

    // Calculate statistics
    const responseCount = timeline.filter(p => p.hasResponse).length
    const reactionValues = timeline
      .filter(p => p.hasResponse && p.reactionValue != null)
      .map(p => p.reactionValue!)
    const averageSpiritProbability = reactionValues.length > 0
      ? reactionValues.reduce((sum, val) => sum + val, 0) / reactionValues.length
      : 0

    return {
      id: participant.id,
      name: null,
      sessions: sessionsWithResponses,
      analysisRuns: [],
      sessionCount: sessions.length,
      responseCount,
      averageSpiritProbability,
      lastActivity: sessions.length > 0 && sessions[0].endTs
        ? Number(sessions[0].endTs)
        : null,
    }
  } catch (error) {
    console.error(`Failed to get participant data for ${participantId}:`, error)
    return null
  }
}
