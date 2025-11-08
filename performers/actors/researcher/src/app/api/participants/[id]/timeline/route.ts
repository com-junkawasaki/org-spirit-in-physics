/**
 * Merkle DAG: api.participants.timeline
 * Next.js API route for fetching participant timeline data
 * RDF: https://spirit-in-physics.gftd.ai/api/participants/timeline
 * 
 * This route calls the GraphQL API's participantTimeline query and transforms
 * the response to match the format expected by TimelineVisualization component.
 */

import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const participantId = params.id

  if (!participantId) {
    return NextResponse.json(
      { success: false, error: 'Participant ID is required' },
      { status: 400 }
    )
  }

  // Validate environment variables
  const graphqlUrl = process.env.GRAPHQL_RUST_API_URL || 'http://graphql:8080/graphql'
  // Extract base URL safely (remove trailing /graphql if present)
  const graphqlBaseUrl = graphqlUrl.endsWith('/graphql') 
    ? graphqlUrl.slice(0, -7) // Remove '/graphql' (7 characters)
    : graphqlUrl.replace(/\/graphql\/?$/, '') // Fallback: remove /graphql at the end
  console.log('[Timeline API] Starting request for participant:', participantId)
  console.log('[Timeline API] GraphQL URL:', graphqlUrl)
  console.log('[Timeline API] GraphQL Base URL:', graphqlBaseUrl)

  // Optional: Test GraphQL service connectivity (non-blocking, for debugging)
  try {
    const healthUrl = `${graphqlBaseUrl}/health`
    const healthResponse = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout for health check
    }).catch(() => null)
    
    if (healthResponse?.ok) {
      console.log('[Timeline API] GraphQL service health check: OK')
    } else {
      console.warn('[Timeline API] GraphQL service health check: Failed or unavailable (this may be normal if health endpoint is not implemented)')
    }
  } catch (healthError) {
    // Health check failure is not critical, just log it
    console.warn('[Timeline API] GraphQL service health check error:', healthError)
  }

  try {
    const graphqlQuery = `
      query ParticipantTimeline($participantId: String!) {
        participantTimeline(participantId: $participantId) {
          timelineData {
            timestamp
            word
            reactionTime
            hasResponse
            emotions {
              name
              score
              fileType
            }
            physiological {
              average
              max
              min
            }
            reactionValue
            eventType
            metadata {
              emotionCount
              physiologicalCount
            }
          }
          metadata {
            sessionEvents
            emotionEntries
            physiologicalEntries
            totalDataPoints
            dataSource
            errors
            truncated
            originalSize
          }
        }
      }
    `

    const requestBody = {
      query: graphqlQuery,
      variables: { participantId },
    }

    console.log('[Timeline API] Sending GraphQL request:', {
      url: graphqlUrl,
      participantId,
      queryLength: graphqlQuery.length,
      query: graphqlQuery.substring(0, 200) + '...', // Log first 200 chars of query
      fullQuery: graphqlQuery, // Log full query for debugging
      variables: { participantId },
    })

    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    let response: Response
    try {
      response = await fetch(graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        console.error('[Timeline API] GraphQL API request timeout after 30 seconds')
        return NextResponse.json(
          { 
            success: false, 
            error: 'GraphQL API request timeout',
            details: 'The request took longer than 30 seconds to complete',
            graphqlUrl,
          },
          { status: 504 }
        )
      }

      console.error('[Timeline API] GraphQL API connection error:', {
        error: fetchError.message,
        name: fetchError.name,
        stack: fetchError.stack,
        graphqlUrl,
      })
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to connect to GraphQL API',
          details: fetchError.message || 'Connection error',
          graphqlUrl,
        },
        { status: 503 }
      )
    }

    console.log('[Timeline API] GraphQL API response status:', response.status, response.statusText)

    if (!response.ok) {
      let errorBody: string | null = null
      try {
        errorBody = await response.text()
        console.error('[Timeline API] GraphQL API error response body:', errorBody)
      } catch (e) {
        console.error('[Timeline API] Failed to read error response body')
      }

      return NextResponse.json(
        { 
          success: false, 
          error: `GraphQL API returned ${response.status}: ${response.statusText}`,
          details: errorBody || 'No error details available',
          graphqlUrl,
        },
        { status: response.status >= 500 ? 502 : response.status }
      )
    }

    let result: any
    try {
      result = await response.json()
      console.log('[Timeline API] GraphQL API response received:', {
        hasData: !!result.data,
        hasErrors: !!result.errors,
        errorsCount: result.errors?.length || 0,
      })
    } catch (parseError: any) {
      console.error('[Timeline API] Failed to parse GraphQL API response as JSON:', parseError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON response from GraphQL API',
          details: parseError.message,
          graphqlUrl,
        },
        { status: 502 }
      )
    }

    if (result.errors) {
      console.error('[Timeline API] GraphQL errors:', JSON.stringify(result.errors, null, 2))
      const errorMessages = result.errors.map((e: any) => e.message).join('; ')
      const errorPaths = result.errors.map((e: any) => e.path).filter(Boolean)
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'GraphQL query errors',
          details: errorMessages,
          paths: errorPaths,
          graphqlUrl,
        },
        { status: 500 }
      )
    }

    const timelineResponse = result.data?.participantTimeline

    if (!timelineResponse) {
      console.error('[Timeline API] No timeline data in GraphQL response:', {
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : [],
      })
      return NextResponse.json(
        { 
          success: false, 
          error: 'No timeline data returned from GraphQL API',
          details: 'The GraphQL query succeeded but participantTimeline field is missing',
          graphqlUrl,
        },
        { status: 500 }
      )
    }

    // Transform GraphQL response to format expected by TimelineVisualization
    // The component accepts both short form (t, w, rt, em, ph, rv, e, m) and long form
    const timelineData = timelineResponse.timelineData.map((point: any) => ({
      // Short form (for compactness)
      t: point.timestamp,
      w: point.word,
      rt: point.reactionTime,
      em: point.emotions.map((e: any) => ({
        name: e.name,
        score: e.score,
        fileType: e.fileType,
      })),
      ph: point.physiological,
      rv: point.reactionValue,
      e: point.eventType,
      m: point.metadata,
      // Long form (for clarity)
      timestamp: point.timestamp,
      word: point.word,
      reactionTime: point.reactionTime,
      hasResponse: point.hasResponse,
      emotions: point.emotions.map((e: any) => ({
        name: e.name,
        score: e.score,
        fileType: e.fileType,
      })),
      physiological: point.physiological,
      reactionValue: point.reactionValue,
      eventType: point.eventType,
      metadata: point.metadata,
    }))

    console.log('[Timeline API] Successfully processed timeline data:', {
      dataPointsCount: timelineData.length,
      metadata: timelineResponse.metadata,
    })

    return NextResponse.json({
      success: true,
      data: {
        timelineData,
        metadata: timelineResponse.metadata,
      },
    })
  } catch (error: any) {
    console.error('[Timeline API] Unexpected error:', {
      error: error.message,
      name: error.name,
      stack: error.stack,
      participantId,
      graphqlUrl,
    })
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred',
        graphqlUrl,
      },
      { status: 500 }
    )
  }
}

