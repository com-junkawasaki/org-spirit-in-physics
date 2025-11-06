import { NextRequest, NextResponse } from 'next/server'
import { supabaseManager } from '@/lib/supabase'

/**
 * GET /api/spirits
 * 
 * Merkle DAG: participants_api -> graphql -> participants_query
 * OWL: spirit:DataCollection via GraphQL
 * 
 * DEPRECATED: This endpoint is deprecated. Use GraphQL query directly from the client.
 * Kept for backward compatibility.
 */
export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching participants from GraphQL...')
    
    // Use GraphQL query instead of direct Supabase call
    const graphqlUrl = process.env.NEXT_PUBLIC_RUST_GRAPHQL_URL || 'http://localhost:3003/graphql';
    
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            participants {
              id
              age
              gender
              handedness
              createdAt
              updatedAt
            }
          }
        `,
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const graphqlParticipants = result.data?.participants || [];
    
    console.log('API: Raw participants data:', graphqlParticipants.length, 'participants')
    console.log('API: Participants sample:', graphqlParticipants.slice(0, 2))

    // Process participants data for frontend
    const processedParticipants = graphqlParticipants.map((participant: any) => ({
      id: participant.id || 'unknown',
      name: `参加者 ${participant.id ? participant.id.slice(0, 8) : 'unknown'}`,
      sessionCount: 0, // TODO: Add session count to GraphQL query
      responseCount: 0, // TODO: Add response count to GraphQL query
      averageSpiritProbability: 0, // TODO: Add average spirit probability to GraphQL query
      lastActivity: participant.updatedAt ? new Date(participant.updatedAt).getTime() : null,
      sessions: [] // Simplified for now
    }))

    console.log('API: Processed participants:', processedParticipants.length)
    return NextResponse.json(processedParticipants)
  } catch (error) {
    console.error('API: Failed to fetch participants from GraphQL, falling back to Supabase:', error)
    // Fallback to Supabase if GraphQL fails
    try {
      const participants = await supabaseManager.getParticipants()
      const processedParticipants = (participants || []).map((participant: any) => ({
        id: participant.participant_id || 'unknown',
        name: `参加者 ${participant.participant_id ? participant.participant_id.slice(0, 8) : 'unknown'}`,
        sessionCount: participant.session_count || 0,
        responseCount: participant.total_responses || 0,
        averageSpiritProbability: participant.average_spirit_probability || 0,
        lastActivity: participant.last_activity ? new Date(participant.last_activity).getTime() : null,
        sessions: []
      }))
      return NextResponse.json(processedParticipants)
    } catch (fallbackError) {
      console.error('API: Fallback to Supabase also failed:', fallbackError)
      return NextResponse.json(
        { error: 'Failed to fetch participants', details: (fallbackError as Error).message },
        { status: 500 }
      )
    }
  }
}
