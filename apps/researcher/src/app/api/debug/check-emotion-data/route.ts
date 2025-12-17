// Merkle DAG: debug.check_emotion_data
// Connect RPCデータ確認用のデバッグAPIエンドポイント

import { NextRequest, NextResponse } from "next/server";
import { serverParticipantClient, serverSessionClient, serverTimelineClient } from '@/lib/connect/server-client';
import type { GetTimelineRequest } from '@/generated/proto/timeline/v1/timeline';
import type { GetSessionsRequest } from '@/generated/proto/session/v1/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get('participantId') || '25111604-c7db-4bfd-8662-e55060e332d6';
    const sessionId = searchParams.get('sessionId') || '25111604-c7db-4bfd-8662-e55060e332d6-0';

    const results: any = {
      participantId,
      sessionId,
      checks: {},
      dataSource: 'connect-rpc'
    };

    // 1. 参加者の存在確認
    try {
      const participantsResponse = await serverParticipantClient.getParticipants({});
      const participant = participantsResponse.participants?.find(p => p.id === participantId);
      results.checks.participantExists = !!participant;
      results.checks.participantData = participant ? {
        id: participant.id,
        createdAt: participant.createdAt?.seconds ? new Date(participant.createdAt.seconds * 1000).toISOString() : null
      } : null;
    } catch (error) {
      results.checks.participantExists = false;
      results.checks.participantError = error instanceof Error ? error.message : 'Unknown error';
    }

    // 2. セッションの存在確認
    try {
      const sessionsRequest: GetSessionsRequest = { participantId };
      const sessionsResponse = await serverSessionClient.getSessions(sessionsRequest);
      const session = sessionsResponse.sessions?.find(s => s.id === sessionId);
      results.checks.sessionExists = !!session;
      results.checks.sessionData = session ? {
        id: session.id,
        createdAt: session.createdAt?.seconds ? new Date(session.createdAt.seconds * 1000).toISOString() : null,
        sessionIndex: session.sessionIndex
      } : null;
    } catch (error) {
      results.checks.sessionExists = false;
      results.checks.sessionError = error instanceof Error ? error.message : 'Unknown error';
    }

    // 3-6. 感情データの確認（タイムラインデータから）
    try {
      const timelineRequest: GetTimelineRequest = {
        participantId,
        sessionId: sessionId || undefined
      };
      const timelineResponse = await serverTimelineClient.getTimeline(timelineRequest);
      const timelinePoints = timelineResponse.points || [];
      
      const emotionTypeCounts: Record<string, number> = { burst: 0, face: 0, language: 0, prosody: 0 };
      const sampleIds: Record<string, string[]> = { burst: [], face: [], language: [], prosody: [] };
      
      timelinePoints.forEach((point) => {
        if (point.emotions && point.emotions.length > 0) {
          point.emotions.forEach((emotion) => {
            const fileType = (emotion.fileType || '').toLowerCase();
            if (fileType.includes('burst')) {
              emotionTypeCounts.burst++;
              if (sampleIds.burst.length < 5) sampleIds.burst.push(emotion.name || 'unknown');
            }
            if (fileType.includes('face')) {
              emotionTypeCounts.face++;
              if (sampleIds.face.length < 5) sampleIds.face.push(emotion.name || 'unknown');
            }
            if (fileType.includes('language')) {
              emotionTypeCounts.language++;
              if (sampleIds.language.length < 5) sampleIds.language.push(emotion.name || 'unknown');
            }
            if (fileType.includes('prosody')) {
              emotionTypeCounts.prosody++;
              if (sampleIds.prosody.length < 5) sampleIds.prosody.push(emotion.name || 'unknown');
            }
          });
        }
      });
      
    results.checks.burstEmotionData = {
        count: emotionTypeCounts.burst,
        sampleIds: sampleIds.burst,
        sampleRecordIds: []
      };
    results.checks.faceEmotionData = {
        count: emotionTypeCounts.face,
        sampleIds: sampleIds.face,
        sampleRecordIds: []
      };
    results.checks.languageEmotionData = {
        count: emotionTypeCounts.language,
        sampleIds: sampleIds.language,
        sampleRecordIds: []
      };
    results.checks.prosodyEmotionData = {
        count: emotionTypeCounts.prosody,
        sampleIds: sampleIds.prosody,
        sampleRecordIds: []
    };

      // 7. サンプルデータの詳細確認
      if (timelinePoints.length > 0 && timelinePoints[0].emotions && timelinePoints[0].emotions.length > 0) {
        const firstEmotion = timelinePoints[0].emotions[0];
        const firstPointTime = timelinePoints[0].time?.seconds 
          ? new Date(timelinePoints[0].time.seconds * 1000).toISOString() 
          : null;
        results.checks.sampleBurstData = {
          id: firstEmotion.name || 'unknown',
          recordId: firstPointTime,
          beginTime: firstPointTime,
          endTime: firstPointTime,
          emotionScores: { [firstEmotion.name || 'unknown']: firstEmotion.score || 0 },
          vocalTypes: []
        };
    }

    // 8. 全セッションの感情データ数確認
      const sessionsRequest: GetSessionsRequest = { participantId };
      const sessionsResponse = await serverSessionClient.getSessions(sessionsRequest);
      const sessions = sessionsResponse.sessions || [];
      results.checks.allSessionsEmotionData = await Promise.all(
        sessions.map(async (s) => {
          const sessionTimelineRequest: GetTimelineRequest = {
            participantId,
            sessionId: s.id
          };
          const sessionTimelineResponse = await serverTimelineClient.getTimeline(sessionTimelineRequest);
          const sessionTimelinePoints = sessionTimelineResponse.points || [];
          const counts = { burst: 0, face: 0, language: 0, prosody: 0 };
          sessionTimelinePoints.forEach((point) => {
            if (point.emotions && point.emotions.length > 0) {
              point.emotions.forEach((emotion) => {
                const fileType = (emotion.fileType || '').toLowerCase();
                if (fileType.includes('burst')) counts.burst++;
                if (fileType.includes('face')) counts.face++;
                if (fileType.includes('language')) counts.language++;
                if (fileType.includes('prosody')) counts.prosody++;
              });
            }
          });
          return {
            sessionId: s.id,
            burstCount: counts.burst,
            faceCount: counts.face,
            languageCount: counts.language,
            prosodyCount: counts.prosody
          };
        })
      );
    } catch (error) {
      results.checks.emotionDataError = error instanceof Error ? error.message : 'Unknown error';
    }

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Debug check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

