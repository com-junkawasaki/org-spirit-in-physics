// Merkle DAG: debug.check_emotion_data
// GraphQLデータ確認用のデバッグAPIエンドポイント

import { NextRequest, NextResponse } from "next/server";
import { graphqlClient, GetParticipantsDocument, GetSessionsDocument, GetTimelineDocument } from '@/lib/graphql/client';
import type { GetParticipantsQueryResult, GetSessionsQueryResult, GetTimelineQueryResult } from '@/generated/graphql';

// Force dynamic rendering to avoid static generation errors
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get('participantId') || '25111604-c7db-4bfd-8662-e55060e332d6';
    const sessionId = searchParams.get('sessionId') || '25111604-c7db-4bfd-8662-e55060e332d6-0';

    const results: any = {
      participantId,
      sessionId,
      checks: {},
      dataSource: 'graphql'
    };

    // 1. 参加者の存在確認
    try {
      const participantsData = await graphqlClient.request<GetParticipantsQueryResult>(GetParticipantsDocument);
      const participant = participantsData.participants?.find(p => p.id === participantId);
      results.checks.participantExists = !!participant;
      results.checks.participantData = participant ? {
        id: participant.id,
        createdAt: participant.createdAt
      } : null;
    } catch (error) {
      results.checks.participantExists = false;
      results.checks.participantError = error instanceof Error ? error.message : 'Unknown error';
    }

    // 2. セッションの存在確認
    try {
      const sessionsData = await graphqlClient.request<GetSessionsQueryResult>(GetSessionsDocument, { participantId });
      const session = sessionsData.sessions?.find(s => s.id === sessionId);
      results.checks.sessionExists = !!session;
      results.checks.sessionData = session ? {
        id: session.id,
        createdAt: session.createdAt,
        sessionIndex: session.sessionIndex
      } : null;
    } catch (error) {
      results.checks.sessionExists = false;
      results.checks.sessionError = error instanceof Error ? error.message : 'Unknown error';
    }

    // 3-6. 感情データの確認（タイムラインデータから）
    try {
      const timelineData = await graphqlClient.request<GetTimelineQueryResult>(GetTimelineDocument, {
        participantId,
        sessionId: sessionId || undefined
      });
      const timeline = timelineData.timeline || [];
      
      const emotionTypeCounts: Record<string, number> = { burst: 0, face: 0, language: 0, prosody: 0 };
      const sampleIds: Record<string, string[]> = { burst: [], face: [], language: [], prosody: [] };
      
      timeline.forEach((point: any) => {
        if (Array.isArray(point.emotions)) {
          point.emotions.forEach((emotion: any) => {
            const fileType = (emotion.fileType || emotion.file_type || '').toLowerCase();
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
      if (timeline.length > 0 && Array.isArray(timeline[0].emotions) && timeline[0].emotions.length > 0) {
        const firstEmotion = timeline[0].emotions[0];
        results.checks.sampleBurstData = {
          id: firstEmotion.name || 'unknown',
          recordId: timeline[0].time || null,
          beginTime: timeline[0].time || null,
          endTime: timeline[0].time || null,
          emotionScores: { [firstEmotion.name || 'unknown']: firstEmotion.score || 0 },
          vocalTypes: []
        };
    }

    // 8. 全セッションの感情データ数確認
      const sessionsData = await graphqlClient.request<GetSessionsQueryResult>(GetSessionsDocument, { participantId });
      const sessions = sessionsData.sessions || [];
      results.checks.allSessionsEmotionData = await Promise.all(
        sessions.map(async (s: any) => {
          const sessionTimelineData = await graphqlClient.request<GetTimelineQueryResult>(GetTimelineDocument, {
            participantId,
            sessionId: s.id
          });
          const sessionTimeline = sessionTimelineData.timeline || [];
          const counts = { burst: 0, face: 0, language: 0, prosody: 0 };
          sessionTimeline.forEach((point: any) => {
            if (Array.isArray(point.emotions)) {
              point.emotions.forEach((emotion: any) => {
                const fileType = (emotion.fileType || emotion.file_type || '').toLowerCase();
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

