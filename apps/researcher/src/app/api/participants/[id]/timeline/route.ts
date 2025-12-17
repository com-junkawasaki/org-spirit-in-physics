import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { unstable_cache } from 'next/cache';
import { serverTimelineClient, serverSessionClient } from '@/lib/connect/server-client';
import type { GetTimelineRequest, TimelinePoint } from '@/generated/proto/timeline/v1/timeline';
import type { GetSessionsRequest } from '@/generated/proto/session/v1/session';

// Merkle DAG: participants.timeline.endpoint
// 時系列統合可視化データ取得APIエンドポイント（Connect RPC版）
// Connect RPC経由でデータを取得

// Cache duration: 5 minutes (300 seconds)
const CACHE_DURATION = 300;

// Helper function to fetch timeline data (will be cached)
async function fetchTimelineData(
  participantId: string,
  actualSessionId: string | undefined,
  startTimeParam: string | null,
  endTimeParam: string | null,
  interval: string | null
) {
  // Parse timestamps
  let startTime: Date | undefined;
  let endTime: Date | undefined;
  
  if (startTimeParam) {
    startTime = new Date(startTimeParam);
  }
  if (endTimeParam) {
    endTime = new Date(endTimeParam);
  }

  const request: GetTimelineRequest = {
    participantId,
    sessionId: actualSessionId,
    startTime: startTime ? { seconds: Math.floor(startTime.getTime() / 1000) } : undefined,
    endTime: endTime ? { seconds: Math.floor(endTime.getTime() / 1000) } : undefined,
    interval: interval || undefined,
  };
  
  const response = await serverTimelineClient.getTimeline(request);
  return response.points;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const startTime = Date.now();
  try {
    const resolvedParams = await Promise.resolve(params);
    const { id: participantId } = resolvedParams;
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
    if (sessionId?.includes('-') && sessionId.split('-').length > 5) {
      // sessionId is in format participantId-sessionIndex (e.g., "25111604-c7db-4bfd-8662-e55060e332d6-0")
      // Extract sessionIndex and find the actual UUID from sessions
      try {
        const sessionsRequest: GetSessionsRequest = { participantId };
        const sessionsResponse = await serverSessionClient.getSessions(sessionsRequest);
        const sessions = sessionsResponse.sessions || [];
        const sessionIndexMatch = sessionId.match(/-(\d+)$/);
        if (sessionIndexMatch) {
          const sessionIndex = parseInt(sessionIndexMatch[1], 10);
          const targetSession = sessions.find((s) => 
            (s.sessionIndex ?? 0) === sessionIndex
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
    if (actualSessionId?.includes('-') && actualSessionId.split('-').length !== 5) {
      console.warn(`[TIMELINE API] Invalid UUID format: ${actualSessionId}, skipping sessionId filter`);
      actualSessionId = undefined;
    }

    // Query Connect RPC service for timeline data (with caching)
    console.log(`[TIMELINE API] Querying Connect RPC service... (cache: ${bypassCache ? 'bypassed' : 'enabled'})`);
    const queryStartTime = Date.now();
    
    let timelinePoints: TimelinePoint[];
    if (bypassCache) {
      // Bypass cache for debugging
      timelinePoints = await fetchTimelineData(participantId, actualSessionId, startTimeParam, endTimeParam, interval);
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
      timelinePoints = await cachedFetch();
    }
    
    const queryDuration = Date.now() - queryStartTime;
    
    console.log(`[TIMELINE API] ✓ Connect RPC query completed in ${queryDuration}ms`);
    console.log(`[TIMELINE API] Timeline data points: ${timelinePoints?.length || 0}`);

    // Transform Connect RPC response to API response format
    const timelineData = (timelinePoints || []).map((point) => {
      // Parse time field - Connect RPC returns timestamp
      const timestamp = point.time?.seconds ? point.time.seconds * 1000 : Date.now();

      // Transform emotions array - ensure proper structure
      const emotions = point.emotions.map((e) => ({
        n: e.name || '',
        s: typeof e.score === 'number' ? e.score : 0,
        t: e.fileType || '',
        c: e.color || null, // Include color from database
      }));

      // Calculate physiological stats
      const physiologicalValues = point.physiological.length > 0
        ? {
            average: point.physiological.reduce((sum, p) => sum + (p.value || 0), 0) / point.physiological.length,
            max: Math.max(...point.physiological.map(p => p.value || 0)),
            min: Math.min(...point.physiological.map(p => p.value || 0)),
          }
        : { average: 0, max: 0, min: 0 };
      
      // Ensure metadata is an object
      const metadata = point.metadata && typeof point.metadata === 'object'
        ? point.metadata
        : { emotionCount: 0, physiologicalCount: 0 };
      
      return {
        ts: timestamp,
        w: point.word || null,
        rt: point.reactionTime ?? null,
        rv: point.reactionValue ?? null,
        em: emotions,
        ph: physiologicalValues,
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
          dataSource: 'connect-rpc',
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
  } catch (error: unknown) {
    console.error('[TIMELINE API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as { code?: string })?.code;
    
    // Connect RPC error details
    if (errorCode) {
      console.error('[TIMELINE API] Connect RPC error code:', errorCode);
      return NextResponse.json(
        {
          success: false,
          error: `Connect RPC request failed: ${errorCode}`,
          errors: [errorMessage],
        },
        { status: 500 }
      );
    }
    
    // Network errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Network error: Failed to connect to Connect RPC service',
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
