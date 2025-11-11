import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from 'next/cache';
import { graphqlClient, GetTimelineDocument, GetSessionsDocument } from '@/lib/graphql/client';
import type { GetTimelineQueryResult, GetSessionsQueryResult } from '@/generated/graphql';

// Merkle DAG: participants.timeline.endpoint
// 時系列統合可視化データ取得APIエンドポイント
// GraphQL経由でデータを取得

// Cache duration: 5 minutes (300 seconds)
const CACHE_DURATION = 300;

// Helper function to fetch timeline data (will be cached)
async function fetchTimelineData(
  participantId: string,
  actualSessionId: string | undefined,
  startTimeParam: string | null,
  endTimeParam: string | null,
  interval: string | null
): Promise<GetTimelineQueryResult> {
  const variables: any = {
    participantId,
    ...(actualSessionId ? { sessionId: actualSessionId } : {}),
    ...(startTimeParam ? { startTime: startTimeParam } : {}),
    ...(endTimeParam ? { endTime: endTimeParam } : {}),
    ...(interval ? { interval } : {}),
  };
  
  return await graphqlClient.request<GetTimelineQueryResult>(GetTimelineDocument, variables);
}

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
    
    // Check if cache should be bypassed (for debugging)
    const bypassCache = searchParams.get('_t') !== null; // _t parameter bypasses cache

    console.log(`[TIMELINE API] ===== Request started =====`);
    console.log(`[TIMELINE API] Participant: ${participantId}${sessionId ? `, Session: ${sessionId}` : ''}`);
    console.log(`[TIMELINE API] Timestamp: ${new Date().toISOString()}`);

    // Convert sessionId from participantId-sessionIndex format to UUID if needed
    let actualSessionId: string | undefined = sessionId || undefined;
    if (sessionId && sessionId.includes('-') && sessionId.split('-').length > 5) {
      // sessionId is in format participantId-sessionIndex (e.g., "25111604-c7db-4bfd-8662-e55060e332d6-0")
      // Extract sessionIndex and find the actual UUID from sessions
      try {
              const sessionsData = await graphqlClient.request<GetSessionsQueryResult>(GetSessionsDocument, { participantId });
        const sessions = sessionsData.sessions || [];
        const sessionIndexMatch = sessionId.match(/-(\d+)$/);
        if (sessionIndexMatch) {
          const sessionIndex = parseInt(sessionIndexMatch[1], 10);
          const targetSession = sessions.find((s: any) => 
            (s.sessionIndex ?? s.session_index) === sessionIndex
          );
          if (targetSession) {
            actualSessionId = targetSession.id;
            console.log(`[TIMELINE API] Converted sessionId from ${sessionId} to UUID: ${actualSessionId}`);
          } else {
            console.warn(`[TIMELINE API] Session with index ${sessionIndex} not found, skipping sessionId filter`);
            // If session not found, don't filter by sessionId - get all timeline data for participant
            actualSessionId = undefined;
          }
        }
      } catch (error) {
        console.warn(`[TIMELINE API] Failed to convert sessionId, skipping sessionId filter:`, error);
        // If conversion fails, don't filter by sessionId - get all timeline data for participant
        actualSessionId = undefined;
      }
    }
    
    // Validate UUID format if sessionId is provided
    if (actualSessionId && actualSessionId.includes('-') && actualSessionId.split('-').length !== 5) {
      console.warn(`[TIMELINE API] Invalid UUID format: ${actualSessionId}, skipping sessionId filter`);
      actualSessionId = undefined;
    }

    // Query GraphQL service for timeline data (with caching)
    console.log(`[TIMELINE API] Querying GraphQL service... (cache: ${bypassCache ? 'bypassed' : 'enabled'})`);
    const queryStartTime = Date.now();
    
    let data: GetTimelineQueryResult;
    if (bypassCache) {
      // Bypass cache for debugging
      data = await fetchTimelineData(participantId, actualSessionId, startTimeParam, endTimeParam, interval);
    } else {
      // Use cached version
      const cacheKey = `timeline-${participantId}-${actualSessionId || 'all'}-${startTimeParam || 'none'}-${endTimeParam || 'none'}-${interval || 'none'}`;
      const cachedFetch = unstable_cache(
        async () => fetchTimelineData(participantId, actualSessionId, startTimeParam, endTimeParam, interval),
        [cacheKey],
        {
          revalidate: CACHE_DURATION,
          tags: [`timeline-${participantId}`],
        }
      );
      data = await cachedFetch();
    }
    
    const queryDuration = Date.now() - queryStartTime;
    
    console.log(`[TIMELINE API] ✓ GraphQL query completed in ${queryDuration}ms`);
    console.log(`[TIMELINE API] Timeline data points: ${data.timeline?.length || 0}`);

    // Transform GraphQL response to API response format
    const timelineData = (data.timeline || []).map((point: any) => {
      // Parse time field - GraphQL returns ISO 8601 string
      let timestamp: number;
      if (typeof point.time === 'string') {
        timestamp = new Date(point.time).getTime();
      } else if (typeof point.time === 'number') {
        // Already in milliseconds
        timestamp = point.time;
      } else {
        console.warn('[TIMELINE API] Invalid time format:', point.time);
        timestamp = Date.now(); // Fallback
      }

      // Transform emotions array - ensure proper structure
      const emotions = Array.isArray(point.emotions) 
        ? point.emotions.map((e: any) => ({
            n: e.name || '',
            s: typeof e.score === 'number' ? e.score : 0,
            t: e.fileType || e.file_type || '',
          }))
        : [];

      // Ensure physiological is an object
      const physiological = point.physiological && typeof point.physiological === 'object'
        ? point.physiological
        : { average: 0, max: 0, min: 0 };
      
      // Ensure metadata is an object
      const metadata = point.metadata && typeof point.metadata === 'object'
        ? point.metadata
        : { emotionCount: 0, physiologicalCount: 0 };
      
      return {
        ts: timestamp,
        w: point.word || null,
        rt: point.reactionTime ?? point.reaction_time ?? null,
        rv: point.reactionValue ?? point.reaction_value ?? null,
        em: emotions,
        ph: physiological,
        md: metadata,
      };
    });

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
          cached: !bypassCache,
          cacheDuration: CACHE_DURATION,
          errors: [],
        },
      },
    };

    const response = NextResponse.json(responseData);
    
    // Add cache headers for client-side caching
    if (!bypassCache) {
      response.headers.set('Cache-Control', `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${CACHE_DURATION * 2}`);
    } else {
      response.headers.set('Cache-Control', 'no-store');
    }
    
    return response;
  } catch (error: any) {
    console.error('[TIMELINE API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // GraphQL error details
    if (error.response?.errors) {
      const graphqlErrors = error.response.errors.map((e: any) => e.message).join('; ');
      console.error('[TIMELINE API] GraphQL errors:', graphqlErrors);
      return NextResponse.json(
        {
          success: false,
          error: `GraphQL query failed: ${graphqlErrors}`,
          errors: [graphqlErrors, errorMessage],
        },
        { status: 500 }
      );
    }
    
    // Network errors
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Network error: Failed to connect to GraphQL service',
          errors: [errorMessage],
        },
        { status: 503 }
      );
    }
    
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
