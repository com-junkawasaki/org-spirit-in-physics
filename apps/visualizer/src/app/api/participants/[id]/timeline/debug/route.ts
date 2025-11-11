// Merkle DAG: participants.timeline.debug.endpoint
// タイムラインデータのデバッグ情報取得APIエンドポイント
// GraphQL経由でデータを取得

import { NextRequest, NextResponse } from "next/server";
import { graphqlClient, GET_TIMELINE, GET_SESSIONS } from '@/lib/graphql/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: participantId } = params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    const debugInfo: any = {
      participantId,
      sessionId: sessionId || null,
      timestamp: new Date().toISOString(),
      checks: {},
      dataSource: 'graphql'
    };
    
    // 1. Sessionデータの存在確認
    try {
      const sessionsData = await graphqlClient.request(GET_SESSIONS, { participantId });
      const sessions = sessionsData.sessions || [];
      const targetSession = sessionId 
        ? sessions.find((s: any) => s.id === sessionId)
        : sessions[0] || null;
      
      debugInfo.checks.session = {
        exists: !!targetSession,
        count: sessions.length,
        sample: targetSession ? {
          id: targetSession.id,
          sessionIndex: targetSession.sessionIndex ?? targetSession.session_index,
          startTs: targetSession.startTs ?? targetSession.start_ts,
          endTs: targetSession.endTs ?? targetSession.end_ts,
          hasEvents: !!targetSession.events && Array.isArray(targetSession.events) && targetSession.events.length > 0,
          eventsCount: Array.isArray(targetSession.events) ? targetSession.events.length : 0
        } : null
      };
    } catch (error: any) {
      debugInfo.checks.session = { error: error.message };
    }
    
    // 2. Timelineデータの存在確認
    try {
      const timelineData = await graphqlClient.request(GET_TIMELINE, {
        participantId,
        sessionId: sessionId || undefined
      });
      
      const timeline = timelineData.timeline || [];
      const emotionsCount = timeline.reduce((acc: number, point: any) => {
        return acc + (Array.isArray(point.emotions) ? point.emotions.length : 0);
      }, 0);
      
      const emotionTypes = new Set<string>();
      timeline.forEach((point: any) => {
        if (Array.isArray(point.emotions)) {
          point.emotions.forEach((e: any) => {
            if (e.file_type) emotionTypes.add(e.file_type);
          });
        }
      });
      
      debugInfo.checks.timeline = {
        exists: timeline.length > 0,
        count: timeline.length,
        emotionsCount,
        emotionTypes: Array.from(emotionTypes),
        hasPhysiological: timeline.some((p: any) => p.physiological && typeof p.physiological === 'object'),
        sample: timeline.length > 0 ? {
          firstPoint: {
            time: timeline[0].time,
            hasWord: !!timeline[0].word,
            hasReaction: timeline[0].hasResponse || timeline[0].has_response || false,
            emotionsCount: Array.isArray(timeline[0].emotions) ? timeline[0].emotions.length : 0
          },
          lastPoint: timeline.length > 1 ? {
            time: timeline[timeline.length - 1].time,
            hasWord: !!timeline[timeline.length - 1].word,
            hasReaction: timeline[timeline.length - 1].hasResponse || timeline[timeline.length - 1].has_response || false,
            emotionsCount: Array.isArray(timeline[timeline.length - 1].emotions) ? timeline[timeline.length - 1].emotions.length : 0
          } : null
        } : null
      };
      
      // 感情データの種類別カウント
      const emotionTypeCounts: Record<string, number> = {};
      timeline.forEach((point: any) => {
        if (Array.isArray(point.emotions)) {
          point.emotions.forEach((e: any) => {
            const type = e.file_type || 'unknown';
            emotionTypeCounts[type] = (emotionTypeCounts[type] || 0) + 1;
          });
        }
      });
      
      debugInfo.checks.emotions = {
        burst: { exists: emotionTypeCounts.burst > 0, count: emotionTypeCounts.burst || 0 },
        face: { exists: emotionTypeCounts.face > 0, count: emotionTypeCounts.face || 0 },
        language: { exists: emotionTypeCounts.language > 0, count: emotionTypeCounts.language || 0 },
        prosody: { exists: emotionTypeCounts.prosody > 0, count: emotionTypeCounts.prosody || 0 }
      };
      
      debugInfo.checks.physiological = {
        exists: timeline.some((p: any) => p.physiological && typeof p.physiological === 'object'),
        count: timeline.filter((p: any) => p.physiological && typeof p.physiological === 'object').length
      };
    } catch (error: any) {
      debugInfo.checks.timeline = { error: error.message };
    }
    
    // 3. データ信頼性スコアの計算
    const reliability = {
      session: debugInfo.checks.session?.exists ? 1.0 : 0.0,
      emotions: {
        burst: debugInfo.checks.emotions?.burst?.exists ? 1.0 : 0.0,
        face: debugInfo.checks.emotions?.face?.exists ? 1.0 : 0.0,
        language: debugInfo.checks.emotions?.language?.exists ? 1.0 : 0.0,
        prosody: debugInfo.checks.emotions?.prosody?.exists ? 1.0 : 0.0
      },
      physiological: debugInfo.checks.physiological?.exists ? 1.0 : 0.0
    };
    
    const emotionCount = Object.values(reliability.emotions).filter(v => v > 0).length;
    reliability.emotions.total = emotionCount / 4; // 4種類中何種類存在するか
    
    reliability.overall = (
      reliability.session * 0.3 +
      reliability.emotions.total * 0.5 +
      reliability.physiological * 0.2
    );
    
    debugInfo.reliability = reliability;
    
    return NextResponse.json(debugInfo);
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error', checks: {}, reliability: { overall: 0 } },
      { status: 500 }
    );
  }
}
