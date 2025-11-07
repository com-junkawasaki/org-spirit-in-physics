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

  try {
    // Get GraphQL API URL (server-side uses internal Docker network)
    const graphqlUrl = process.env.GRAPHQL_RUST_API_URL || 'http://graphql:8080/graphql'
    
    // Call GraphQL API
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
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
        `,
        variables: { participantId },
      }),
    })

    if (!response.ok) {
      console.error(`GraphQL API error: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { 
          success: false, 
          error: `GraphQL API returned ${response.status}: ${response.statusText}` 
        },
        { status: response.status }
      )
    }

    const result = await response.json()

    if (result.errors) {
      console.error('GraphQL errors:', result.errors)
      return NextResponse.json(
        { 
          success: false, 
          error: result.errors.map((e: any) => e.message).join('; ') 
        },
        { status: 500 }
      )
    }

    const timelineResponse = result.data?.participantTimeline

    if (!timelineResponse) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No timeline data returned from GraphQL API' 
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

    return NextResponse.json({
      success: true,
      data: {
        timelineData,
        metadata: timelineResponse.metadata,
      },
    })
  } catch (error: any) {
    console.error('Timeline API route error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

