// Merkle DAG: api.participants.timeline
// Timeline API endpoint for research app (gRPC)

import type { APIRoute } from 'astro';
import { getTimeline } from '@spirit-in-physics/grpc-client';

// Disable prerendering for dynamic API routes
export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
  const participantId = params.participantId;
  if (!participantId) {
    return new Response(JSON.stringify({ success: false, error: 'participantId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sessionId = url.searchParams.get('sessionId') || undefined;

  try {
    // Fetch timeline data from gRPC
    const data = await getTimeline({
      participantId,
      sessionId,
    });

    const timelinePoints = data.points || [];
    
    // Convert timeline points to the format expected by TimelineVisualization
    const timelineData = timelinePoints.map((point) => {
      // Convert time string to timestamp (milliseconds)
      const timestamp = typeof point.time === 'string' 
        ? new Date(point.time).getTime() 
        : (typeof point.time === 'number' ? point.time : Date.now());
      
      // Emotions are already in the correct format
      const emotions = Array.isArray(point.emotions) ? point.emotions : [];
      
      // Convert physiological data (array of PhysiologicalData)
      const physiologicalArray = Array.isArray(point.physiological) ? point.physiological : [];
      const physiologicalValues = physiologicalArray
        .map((p) => p.value)
        .filter((v): v is number => v !== undefined && v !== null);

      const physAverage = physiologicalValues.length > 0
        ? physiologicalValues.reduce((sum, val) => sum + val, 0) / physiologicalValues.length
        : 0;
      const physMax = physiologicalValues.length > 0 ? Math.max(...physiologicalValues) : physAverage;
      const physMin = physiologicalValues.length > 0 ? Math.min(...physiologicalValues) : physAverage;

      return {
        w: point.word || '',
        word: point.word || '',
        ts: timestamp,
        timestamp: timestamp,
        rt: point.reactionTime ? Number(point.reactionTime) : 0,
        reactionTime: point.reactionTime ? Number(point.reactionTime) : 0,
        rv: point.reactionValue ?? 0,
        reactionValue: point.reactionValue ?? 0,
        em: emotions,
        emotions: emotions,
        phys: {
          average: physAverage,
          max: physMax,
          min: physMin,
        },
        physiological: {
          average: physAverage,
          max: physMax,
          min: physMin,
        },
        hasResponse: point.hasResponse !== false,
        eventType: point.eventType || 'word_response',
        m: point.metadata || {
          emotionCount: emotions.length,
          physiologicalCount: physiologicalArray.length,
        },
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          timelineData,
          metadata: {
            sessionEvents: timelineData.length,
            emotionEntries: timelineData.reduce((sum, item) => {
              return sum + (item.em?.length || 0);
            }, 0),
            physiologicalEntries: timelineData.filter((item) => {
              return item.phys && Object.keys(item.phys).length > 0;
            }).length,
            totalDataPoints: timelineData.length,
            errors: [],
          },
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // 5 minutes cache
        },
      }
    );
  } catch (error) {
    console.error('Timeline API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
