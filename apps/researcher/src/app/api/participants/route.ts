import { NextRequest, NextResponse } from 'next/server'
import { getAllParticipants } from '@/lib/data'

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching participants from GraphQL...')

    // GraphQL経由で参加者データを取得
    const participants = await getAllParticipants()

    console.log('API: Raw participants data:', participants?.length || 0, 'participants')
    console.log('API: Participants sample:', participants?.slice(0, 2))

    // Process participants data for frontend
    const processedParticipants = participants.map((participant) => ({
      id: participant.id,
      name: participant.name || `参加者 ${participant.id.slice(0, 8)}`,
      sessionCount: participant.sessionCount,
      responseCount: participant.responseCount,
      averageSpiritProbability: participant.averageSpiritProbability,
      lastActivity: participant.lastActivity,
      sessions: participant.sessions.map(s => ({
        id: s.id,
        sessionType: s.session_type,
        startTime: s.start_time,
        endTime: s.end_time,
        responseCount: s.responseCount
      }))
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
