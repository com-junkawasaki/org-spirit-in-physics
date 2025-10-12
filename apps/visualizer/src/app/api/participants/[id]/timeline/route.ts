import { NextRequest, NextResponse } from 'next/server'
import { createArangoDBClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: participantId } = await params

    const client = createArangoDBClient()

    // Get participant data
    const participant = await client.getParticipantDetails(participantId)

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Get all responses for this participant
    const responses = await client.getParticipantResponses(participantId)

    if (!responses || responses.length === 0) {
      return NextResponse.json({ error: 'No responses found' }, { status: 404 })
    }

    // Group responses by session
    const sessionMap: Record<string, any[]> = {}
    responses.forEach(response => {
      const sessionId = response.session_id || 'default-session'
      if (!sessionMap[sessionId]) {
        sessionMap[sessionId] = []
      }
      sessionMap[sessionId].push(response)
    })

    // Calculate session statistics
    const sessionStats = Object.entries(sessionMap).map(([sessionId, sessionResponses]) => {
      const totalResponseTime = sessionResponses.reduce((sum, r) => sum + (r.reaction_time_ms || 0), 0)

      return {
        session_id: sessionId,
        session_type: 'session-1', // Simplified
        start_time: null,
        end_time: null,
        response_count: sessionResponses.length,
        avg_response_time_ms: sessionResponses.length > 0 ? Math.round(totalResponseTime / sessionResponses.length) : 0,
        responses: sessionResponses.map(r => ({
          id: r.id,
          stimulus_word: r.stimulus_word,
          response_word: r.response_word,
          reaction_time_ms: r.reaction_time_ms,
          timestamp: new Date().toISOString(), // Mock timestamp
          emotion: r.emotion,
          emotion_confidence: r.emotion_confidence,
          skin_potential: 0, // Mock
          relative_time_ms: 0 // Mock
        }))
      }
    })

    // Calculate overall statistics
    const totalResponses = responses.length
    const totalResponseTime = responses.reduce((sum, r) => sum + (r.reaction_time_ms || 0), 0)
    const avgResponseTime = totalResponses > 0 ? Math.round(totalResponseTime / totalResponses) : 0

    // Group responses by time windows for distribution analysis
    const timeDistribution: Record<string, number> = {}
    responses.forEach((response, index) => {
      // Mock time distribution based on response index
      const minutes = Math.floor(index / 10)
      const timeWindow = `${minutes}-${minutes + 1}min`
      timeDistribution[timeWindow] = (timeDistribution[timeWindow] || 0) + 1
    })

    // Word frequency analysis
    const wordFrequency: Record<string, number> = {}
    responses.forEach(response => {
      if (response.stimulus_word) {
        wordFrequency[response.stimulus_word] = (wordFrequency[response.stimulus_word] || 0) + 1
      }
    })

    const timelineData = {
      session_info: {
        participant_id: participantId,
        participant_name: `Participant ${participantId.slice(0, 8)}`,
        total_sessions: Object.keys(sessionMap).length,
        total_events: totalResponses,
        total_response_time_ms: totalResponseTime,
        avg_response_time_ms: avgResponseTime,
        word_count: Object.keys(wordFrequency).length
      },
      sessions: sessionStats,
      event_analysis: {
        event_types: {
          word_displayed: totalResponses,
          speech_detected: totalResponses, // Assuming 1:1 relationship for now
          response_window_opened: totalResponses,
          participant_initialized: Object.keys(sessionMap).length
        },
        word_frequency: wordFrequency,
        time_distribution: timeDistribution
      },
      response_patterns: sessionStats.flatMap(s => s.responses),
      summary: {
        participant_id: participantId,
        total_sessions: Object.keys(sessionMap).length,
        total_responses: totalResponses,
        avg_response_time_ms: avgResponseTime,
        data_completeness: {
          has_consent: true,
          has_session_data: true,
          has_video_files: false, // Would need to check file storage
          has_physiological_data: false, // Mock for now
          data_quality_score: Math.round((totalResponses / Math.max(Object.keys(sessionMap).length * 10, 1)) * 100)
        }
      }
    }

    return NextResponse.json(timelineData)
  } catch (error) {
    console.error('Error fetching participant timeline:', error)
    return NextResponse.json(
      { error: 'Failed to fetch participant timeline' },
      { status: 500 }
    )
  }
}
