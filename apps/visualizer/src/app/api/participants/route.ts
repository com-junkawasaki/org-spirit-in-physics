import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching participants...')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get participants data using the new view
    const { data: participants, error } = await supabase
      .from('participant_summary')
      .select('*')
      .order('last_activity', { ascending: false, nullsLast: true })

    if (error) {
      console.error('API: Error fetching participants:', error)
      return NextResponse.json(
        { error: 'Failed to fetch participants', details: error.message },
        { status: 500 }
      )
    }

    console.log('API: Raw participants data:', participants?.length || 0, 'participants')

    // Process participants data for frontend
    const processedParticipants = (participants || []).map(participant => ({
      id: participant.participant_id,
      name: `参加者 ${participant.participant_id.slice(0, 8)}`, // Default name format
      sessionCount: participant.session_count || 0,
      responseCount: participant.total_responses || 0,
      averageSpiritProbability: participant.average_spirit_probability || 0,
      lastActivity: participant.last_activity ? new Date(participant.last_activity).getTime() : null,
      sessions: participant.sessions || []
    }))

    console.log('API: Processed participants:', processedParticipants.length)
    return NextResponse.json(processedParticipants)
  } catch (error) {
    console.error('API: Failed to fetch participants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch participants', details: error.message },
      { status: 500 }
    )
  }
}
