import { NextRequest, NextResponse } from "next/server";
import { graphqlClient, GET_TIMELINE, GET_SESSIONS } from '@/lib/graphql/client';

// Merkle DAG: participants.timeline.endpoint
// 時系列統合可視化データ取得APIエンドポイント
// GraphQL経由でデータを取得

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const { id: participantId } = params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const startTimeParam = searchParams.get('startTime');
    const endTimeParam = searchParams.get('endTime');
    const interval = searchParams.get('interval'); // e.g., "1 hour", "1 day"

    console.log(`[TIMELINE API] ===== Request started =====`);
    console.log(`[TIMELINE API] Participant: ${participantId}${sessionId ? `, Session: ${sessionId}` : ''}`);
    console.log(`[TIMELINE API] Timestamp: ${new Date().toISOString()}`);

    // Query GraphQL service for timeline data
    const variables: any = {
      participantId,
      sessionId: sessionId || undefined,
      startTime: startTimeParam || undefined,
      endTime: endTimeParam || undefined,
      interval: interval || undefined,
    };

    console.log(`[TIMELINE API] Querying GraphQL service...`);
    const queryStartTime = Date.now();
    
    const data = await graphqlClient.request(GET_TIMELINE, variables);
    const queryDuration = Date.now() - queryStartTime;
    
    console.log(`[TIMELINE API] ✓ GraphQL query completed in ${queryDuration}ms`);
    console.log(`[TIMELINE API] Timeline data points: ${data.timeline?.length || 0}`);

    // Transform GraphQL response to API response format
    const timelineData = (data.timeline || []).map((point: any) => ({
      ts: new Date(point.time).getTime(),
      w: point.word || null,
      rt: point.reaction_time || null,
      rv: point.reaction_value || null,
      em: point.emotions?.map((e: any) => ({
        n: e.name,
        s: e.score,
        t: e.file_type,
      })) || [],
      ph: point.physiological || {},
      md: point.metadata || {},
    }));

    const totalTime = Date.now() - startTime;
    console.log(`[TIMELINE API] ===== Response =====`);
    console.log(`[TIMELINE API] Total processing time: ${totalTime}ms`);
    console.log(`[TIMELINE API] Timeline data points: ${timelineData.length}`);

    const responseData = {
      success: true,
      data: {
        participantId,
        timelineData: timelineData,
        metadata: {
          totalDataPoints: timelineData.length,
          processingTimeMs: totalTime,
          queryTimeMs: queryDuration,
          dataSource: 'graphql',
          errors: [],
        },
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[TIMELINE API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: `Failed to load timeline data: ${errorMessage}`,
        errors: [errorMessage],
      },
      { status: 500 }
    );
  }
}
