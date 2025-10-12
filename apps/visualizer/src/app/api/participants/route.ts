import { NextRequest, NextResponse } from 'next/server'
import { createArangoDBClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching participants from ArangoDB...')
    const client = createArangoDBClient()

    // Get participants data from ArangoDB
    const participants = await client.getParticipants()

    console.log('API: Raw participants data:', participants?.length || 0, 'participants')

    // Process participants data for frontend
    const processedParticipants = (participants || []).map(participant => ({
      id: participant.participant_id,
      name: `参加者 ${participant.participant_id.slice(0, 8)}`, // Default name format
      sessionCount: participant.session_count || 0,
      responseCount: participant.total_responses || 0,
      averageSpiritProbability: participant.average_spirit_probability || 0,
      lastActivity: participant.last_activity ? new Date(participant.last_activity).getTime() : null,
      sessions: [] // Simplified for now
    }))

    console.log('API: Processed participants:', processedParticipants.length)
    return NextResponse.json(processedParticipants)
  } catch (error) {
    console.error('API: Failed to fetch participants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch participants', details: (error as Error).message },
      { status: 500 }
    )
  }
}
