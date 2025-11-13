// Merkle DAG: api.participants.timeline
// Timeline API endpoint for research app

import type { APIRoute } from 'astro';

// Disable prerendering for dynamic API routes
export const prerender = false;

// Get GraphQL API URL from environment
function getGraphQLApiUrl(): string {
  return import.meta.env.GRAPHQL_API_URL || 'http://graphql-service:8081/graphql';
}

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
    // Fetch timeline data directly from GraphQL using fetch
    const query = `
      query GetTimeline($participantId: ID!, $sessionId: ID) {
        timeline(participantId: $participantId, sessionId: $sessionId) {
          time
          participantId
          sessionId
          word
          eventType
          reactionValue
          reactionTime
          hasResponse
          emotions {
            name
            score
            fileType
          }
          physiological
          metadata
        }
      }
    `;

    const variables: Record<string, any> = { participantId };
    if (sessionId) {
      variables.sessionId = sessionId;
    }
    
    const graphqlUrl = getGraphQLApiUrl();
    
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const timelinePoints = result.data?.timeline || [];
    
    // Convert timeline points to the format expected by TimelineVisualization
    const timelineData = timelinePoints.map((point: any) => {
      // Convert time string to timestamp (milliseconds)
      const timestamp = typeof point.time === 'string' 
        ? new Date(point.time).getTime() 
        : (typeof point.time === 'number' ? point.time : Date.now());
      
      // Emotions are already in the correct format
      const emotions = Array.isArray(point.emotions) ? point.emotions : [];
      
      // Convert physiological data
      const physiological = point.physiological || {};
      const physAverage = typeof physiological.average === 'number' ? physiological.average : 0;
      const physMax = typeof physiological.max === 'number' ? physiological.max : physAverage;
      const physMin = typeof physiological.min === 'number' ? physiological.min : physAverage;

      return {
        w: point.word || '',
        word: point.word || '',
        ts: timestamp,
        timestamp: timestamp,
        rt: point.reactionTime || 0,
        reactionTime: point.reactionTime || 0,
        rv: point.reactionValue || 0,
        reactionValue: point.reactionValue || 0,
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
          physiologicalCount: Object.keys(physiological).length > 0 ? 1 : 0,
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
            emotionEntries: timelineData.reduce((sum, item) => sum + (item?.em?.length || 0), 0),
            physiologicalEntries: timelineData.filter((item) => item?.phys && Object.keys(item.phys).length > 0).length,
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

