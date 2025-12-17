// Merkle DAG: connect.data
// Server-side data fetching functions using Connect RPC
// This replaces GraphQL-based data fetching

// Note: This file will work once protobuf types are generated
// Run: pnpm proto:generate

import { serverParticipantClient, serverSessionClient, serverTimelineClient } from './server-client';
// TODO: Uncomment once protobuf types are generated
// import type { GetParticipantsRequest, GetParticipantRequest } from '@/generated/proto/participant/v1/participant';
// import type { GetSessionsRequest } from '@/generated/proto/session/v1/session';
// import type { GetTimelineRequest } from '@/generated/proto/timeline/v1/timeline';

export interface ParticipantData {
  id: string;
  name?: string;
  sessionCount: number;
  responseCount: number;
  averageSpiritProbability: number;
  lastActivity: number | null;
  sessions: Array<{
    id: string;
    sessionType?: string;
    startTime?: number;
    endTime?: number;
    responseCount: number;
  }>;
}

export interface DashboardStats {
  totalParticipants: number;
  totalSessions: number;
  totalResponses: number;
  averageSpiritProbability: number;
  emotionDistribution: Record<string, number>;
  componentAverages: {
    word2vec: number;
    reaction_time: number;
    skin_potential: number;
    emotion: number;
  };
}

// Server-side data fetching functions - Connect RPC経由
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Connect RPC経由でデータを取得
    const participantsResponse = await serverParticipantClient.getParticipants({ isPublic: undefined });
    const participants = participantsResponse.participants || [];
    const totalParticipants = participants.length;

    // 全参加者のセッションとタイムラインデータを取得して統計を計算
    let totalSessions = 0;
    let totalResponses = 0;
    const emotionDistribution: Record<string, number> = {};
    const reactionValues: number[] = [];
    const components: Array<{ word2vec: number; reaction_time: number; skin_potential: number; emotion: number }> = [];

    for (const participant of participants) {
      try {
        // セッションを取得
        const sessionsResponse = await serverSessionClient.getSessions({ participantId: participant.id });
        const sessions = sessionsResponse.sessions || [];
        totalSessions += sessions.length;

        // タイムラインデータを取得
        const timelineResponse = await serverTimelineClient.getTimeline({ participantId: participant.id });
        const timeline = timelineResponse.points || [];
        
        // レスポンス数をカウント
        const responses = timeline.filter(p => p.hasResponse);
        totalResponses += responses.length;

        // 感情データを集計
        timeline.forEach(point => {
          if (point.emotions && point.emotions.length > 0) {
            point.emotions.forEach(emotion => {
              const emotionName = emotion.name || 'unknown';
              emotionDistribution[emotionName] = (emotionDistribution[emotionName] || 0) + 1;
            });
          }
        });

        // 反応値とコンポーネントを収集
        timeline.forEach(point => {
          if (point.reactionValue != null) {
            reactionValues.push(point.reactionValue);
          }
          // コンポーネントはタイムラインデータからは取得できないため、デフォルト値を使用
          components.push({
            word2vec: 0,
            reaction_time: point.reactionTime ? 10 / (1 + point.reactionTime / 1000) : 0,
            skin_potential: 0,
            emotion: point.emotions && point.emotions.length > 0
              ? point.emotions.reduce((sum, e) => sum + (e.score || 0), 0) / point.emotions.length
              : 0
          });
        });
      } catch (error) {
        console.error(`Failed to fetch data for participant ${participant.id}:`, error);
      }
    }

    // 平均Spirit確率を計算（reactionValueをspirit確率として扱う）
    const averageSpiritProbability = reactionValues.length > 0
      ? reactionValues.reduce((sum, val) => sum + val, 0) / reactionValues.length
      : 0;

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
    };

    return {
      totalParticipants,
      totalSessions,
      totalResponses,
      averageSpiritProbability,
      emotionDistribution,
      componentAverages,
    };
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
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
    };
  }
}

export async function getAllParticipants(): Promise<ParticipantData[]> {
  try {
    // Use Connect RPC to fetch participants
    console.log('[getAllParticipants] Fetching participants from Connect RPC...');
    
    const participantsResponse = await serverParticipantClient.getParticipants({ isPublic: undefined });
    const participants = participantsResponse.participants || [];
    console.log(`[getAllParticipants] Found ${participants.length} participants`);

    // For each participant, get detailed data including statistics
    const participantsWithData = await Promise.all(
      participants.map(async (participant) => {
        const participantId = participant.id;
        
        try {
          console.log(`[getAllParticipants] Processing participant ${participantId}`);
          
          // Get sessions for this participant
          let sessionsResponse;
          try {
            sessionsResponse = await serverSessionClient.getSessions({ participantId });
          } catch (error) {
            console.error(`[getAllParticipants] Failed to fetch sessions for ${participantId}:`, error);
            throw error;
          }
          const sessions = sessionsResponse.sessions || [];
          console.log(`[getAllParticipants] Found ${sessions.length} sessions for participant ${participantId}`);
          
          // Get timeline data to calculate response count and average spirit probability
          let timelineResponse;
          try {
            timelineResponse = await serverTimelineClient.getTimeline({ participantId });
          } catch (error) {
            console.error(`[getAllParticipants] Failed to fetch timeline for ${participantId}:`, error);
            throw error;
          }
          const timeline = timelineResponse.points || [];
          console.log(`[getAllParticipants] Found ${timeline.length} timeline points for participant ${participantId}`);
          
          // Calculate statistics
          const responseCount = timeline.filter((p) => p.hasResponse).length;
          const reactionValues = timeline
            .filter((p) => p.reactionValue != null)
            .map((p) => p.reactionValue ?? 0);
          const averageSpiritProbability = reactionValues.length > 0
            ? reactionValues.reduce((sum, val) => sum + val, 0) / reactionValues.length
            : 0;

          // Get last activity timestamp
          const lastActivity = timeline.length > 0 && timeline[timeline.length - 1].time
            ? Math.floor(timeline[timeline.length - 1].time.seconds * 1000)
            : null;

          return {
            id: participantId,
            name: `参加者 ${participantId.slice(0, 8)}`,
            sessionCount: sessions.length,
            responseCount,
            averageSpiritProbability,
            lastActivity,
            sessions: sessions.map(s => ({
              id: s.id,
              sessionType: undefined,
              startTime: s.startTs,
              endTime: s.endTs ?? undefined,
              responseCount: 0, // Calculate from timeline if needed
            })),
          };
        } catch (error) {
          console.error(`[getAllParticipants] Failed to process participant ${participantId}:`, error);
          return null;
        }
      })
    );

    return participantsWithData.filter(Boolean) as ParticipantData[];
  } catch (error) {
    console.error('[getAllParticipants] Failed to fetch all participants:', error);
    if (error instanceof Error) {
      console.error('[getAllParticipants] Error message:', error.message);
      console.error('[getAllParticipants] Error stack:', error.stack);
    }
    return [];
  }
}

export async function getParticipantData(participantId: string): Promise<ParticipantData | null> {
  try {
    // Connect RPC経由でデータを取得
    const participantResponse = await serverParticipantClient.getParticipant({ id: participantId });
    const participant = participantResponse.participant;
    if (!participant) return null;

    // セッションを取得
    const sessionsResponse = await serverSessionClient.getSessions({ participantId });
    const sessions = sessionsResponse.sessions || [];

    // タイムラインデータを取得してレスポンスを構築
    const timelineResponse = await serverTimelineClient.getTimeline({ participantId });
    const timeline = timelineResponse.points || [];

    // セッションごとにレスポンスをグループ化
    const sessionMap: Record<string, any[]> = {};
    timeline.forEach(point => {
      if (point.hasResponse && point.sessionId) {
        if (!sessionMap[point.sessionId]) {
          sessionMap[point.sessionId] = [];
        }
        sessionMap[point.sessionId].push(point);
      }
    });

    // レスポンス数を計算
    const responseCount = timeline.filter(p => p.hasResponse).length;
    
    // 平均Spirit確率を計算
    const reactionValues = timeline
      .filter(p => p.reactionValue != null)
      .map(p => p.reactionValue ?? 0);
    const averageSpiritProbability = reactionValues.length > 0
      ? reactionValues.reduce((sum, val) => sum + val, 0) / reactionValues.length
      : 0;

    // 最終活動日時を取得
    const lastActivity = timeline.length > 0 && timeline[timeline.length - 1].time
      ? Math.floor(timeline[timeline.length - 1].time.seconds * 1000)
      : null;

    return {
      id: participant.id,
      name: `参加者 ${participant.id.slice(0, 8)}`,
      sessionCount: sessions.length,
      responseCount,
      averageSpiritProbability,
      lastActivity,
      sessions: sessions.map(s => ({
        id: s.id,
        sessionType: undefined,
        startTime: s.startTs,
        endTime: s.endTs ?? undefined,
        responseCount: sessionMap[s.id]?.length || 0,
      })),
    };
  } catch (error) {
    console.error(`[getParticipantData] Failed to fetch participant data for ${participantId}:`, error);
    return null;
  }
}
