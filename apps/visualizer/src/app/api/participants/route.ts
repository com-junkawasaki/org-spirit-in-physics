import { NextRequest, NextResponse } from 'next/server'
import { getAllParticipants } from '@/lib/data'

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching participants...')
    const participants = await getAllParticipants()
    console.log('API: Raw participants data:', participants?.length || 0, 'participants')

    // Process participants data for frontend
    const processedParticipants = participants.map(participant => {
      // Calculate average spirit probability
      const analysisResults = participant.analysisRuns.flatMap(run => run.results)
      const averageSpiritProbability = analysisResults.length > 0
        ? analysisResults.reduce((sum, result) => sum + result.p_value, 0) / analysisResults.length
        : 0

      return {
        id: participant.id,
        name: participant.name,
        sessionCount: participant.sessions.length,
        responseCount: participant.sessions.reduce((sum, session) => sum + session.responses.length, 0),
        averageSpiritProbability,
        lastActivity: participant.sessions.length > 0
          ? Math.max(...participant.sessions.map(s => new Date(s.start_time || '').getTime()))
          : null,
        sessions: participant.sessions.map(session => ({
          id: session.id,
          sessionType: session.session_type,
          startTime: session.start_time,
          endTime: session.end_time,
          responseCount: session.responses.length
        }))
      }
    })

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
