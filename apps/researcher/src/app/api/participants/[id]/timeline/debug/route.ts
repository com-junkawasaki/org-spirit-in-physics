// Merkle DAG: participants.timeline.debug.endpoint
// タイムラインデータのデバッグ情報取得APIエンドポイント（Connect RPC版）
// Connect RPC経由でデータを取得

import { NextRequest, NextResponse } from "next/server";
import { serverSessionClient, serverTimelineClient } from '@/lib/connect/server-client';
import type { GetTimelineRequest } from '@/generated/proto/timeline/v1/timeline';
import type { GetSessionsRequest } from '@/generated/proto/session/v1/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { id: participantId } = resolvedParams;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    const debugInfo: any = {
      participantId,
      sessionId: sessionId || null,
      timestamp: new Date().toISOString(),
      checks: {},
      dataSource: 'connect-rpc'
    };
    
    // 1. Sessionデータの存在確認
    try {
      const sessionsRequest: GetSessionsRequest = { participantId };
      const sessionsResponse = await serverSessionClient.getSessions(sessionsRequest);
      const sessions = sessionsResponse.sessions || [];
      const targetSession = sessionId 
        ? sessions.find((s) => s.id === sessionId)
        : sessions[0] || null;
      
      debugInfo.checks.session = {
        exists: !!targetSession,
        count: sessions.length,
        sample: targetSession ? {
          id: targetSession.id,
          sessionIndex: targetSession.sessionIndex,
          startTs: targetSession.startTs,
          endTs: targetSession.endTs,
          hasEvents: false, // Connect RPCではeventsは別途取得
          eventsCount: 0
        } : null
      };
    } catch (error: unknown) {
      debugInfo.checks.session = { error: error instanceof Error ? error.message : 'Unknown error' };
    }
    
    // 2. Timelineデータの存在確認
    try {
      const timelineRequest: GetTimelineRequest = {
        participantId,
        sessionId: sessionId || undefined
      };
      const timelineResponse = await serverTimelineClient.getTimeline(timelineRequest);
      
      const timelinePoints = timelineResponse.points || [];
      const emotionsCount = timelinePoints.reduce((acc: number, point) => {
        return acc + (point.emotions ? point.emotions.length : 0);
      }, 0);
      
      const emotionTypes = new Set<string>();
      timelinePoints.forEach((point) => {
        if (point.emotions) {
          point.emotions.forEach((e) => {
            if (e.fileType) emotionTypes.add(e.fileType);
          });
        }
      });
      
      const firstPointTime = timelinePoints[0]?.time?.seconds 
        ? new Date(timelinePoints[0].time.seconds * 1000).toISOString() 
        : null;
      const lastPointTime = timelinePoints.length > 1 && timelinePoints[timelinePoints.length - 1]?.time?.seconds
        ? new Date(timelinePoints[timelinePoints.length - 1].time.seconds * 1000).toISOString()
        : null;
      
      debugInfo.checks.timeline = {
        exists: timelinePoints.length > 0,
        count: timelinePoints.length,
        emotionsCount,
        emotionTypes: Array.from(emotionTypes),
        hasPhysiological: timelinePoints.some((p) => p.physiological && p.physiological.length > 0),
        sample: timelinePoints.length > 0 ? {
          firstPoint: {
            time: firstPointTime,
            hasWord: !!timelinePoints[0].word,
            hasReaction: timelinePoints[0].hasResponse || false,
            emotionsCount: timelinePoints[0].emotions ? timelinePoints[0].emotions.length : 0
          },
          lastPoint: timelinePoints.length > 1 ? {
            time: lastPointTime,
            hasWord: !!timelinePoints[timelinePoints.length - 1].word,
            hasReaction: timelinePoints[timelinePoints.length - 1].hasResponse || false,
            emotionsCount: timelinePoints[timelinePoints.length - 1].emotions ? timelinePoints[timelinePoints.length - 1].emotions.length : 0
          } : null
        } : null
      };
        
      // 感情データの種類別カウント
      const emotionTypeCounts: Record<string, number> = {};
      timelinePoints.forEach((point) => {
        if (point.emotions) {
          point.emotions.forEach((e) => {
            const type = e.fileType || 'unknown';
            emotionTypeCounts[type] = (emotionTypeCounts[type] || 0) + 1;
          });
        }
      });
      
      debugInfo.checks.emotions = {
        burst: { exists: (emotionTypeCounts.burst || 0) > 0, count: emotionTypeCounts.burst || 0 },
        face: { exists: (emotionTypeCounts.face || 0) > 0, count: emotionTypeCounts.face || 0 },
        language: { exists: (emotionTypeCounts.language || 0) > 0, count: emotionTypeCounts.language || 0 },
        prosody: { exists: (emotionTypeCounts.prosody || 0) > 0, count: emotionTypeCounts.prosody || 0 }
      };
      
      debugInfo.checks.physiological = {
        exists: timelinePoints.some((p) => p.physiological && p.physiological.length > 0),
        count: timelinePoints.filter((p) => p.physiological && p.physiological.length > 0).length
      };
    } catch (error: any) {
      debugInfo.checks.timeline = { error: error.message };
    }
    
    // 3. データ信頼性スコアの計算
    const reliability: {
      session: number;
      emotions: {
        burst: number;
        face: number;
        language: number;
        prosody: number;
        total: number;
      };
      physiological: number;
      overall: number;
    } = {
      session: debugInfo.checks.session?.exists ? 1.0 : 0.0,
      emotions: {
        burst: debugInfo.checks.emotions?.burst?.exists ? 1.0 : 0.0,
        face: debugInfo.checks.emotions?.face?.exists ? 1.0 : 0.0,
        language: debugInfo.checks.emotions?.language?.exists ? 1.0 : 0.0,
        prosody: debugInfo.checks.emotions?.prosody?.exists ? 1.0 : 0.0,
        total: 0.0
      },
      physiological: debugInfo.checks.physiological?.exists ? 1.0 : 0.0,
      overall: 0.0
    };
    
    const emotionCount = Object.values({
      burst: reliability.emotions.burst,
      face: reliability.emotions.face,
      language: reliability.emotions.language,
      prosody: reliability.emotions.prosody
    }).filter(v => v > 0).length;
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
