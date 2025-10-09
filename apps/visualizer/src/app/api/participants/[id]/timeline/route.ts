import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: participantId } = await params

    const supabase = await createServerSupabaseClient()

    // Get participant data
    const { data: participant } = await supabase
      .from('participants')
      .select('id, name')
      .eq('id', participantId)
      .single()

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Get sessions for this participant
    const { data: sessions } = await supabase
      .from('participant_experiment_sessions')
      .select(`
        id,
        session_id,
        session_type,
        start_time,
        end_time
      `)
      .eq('participant_id', participantId)
      .order('start_time')

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ error: 'No sessions found' }, { status: 404 })
    }

    // Get all responses for this participant
    const { data: responses } = await supabase
      .from('participant_response_data')
      .select(`
        id,
        stimulus_word,
        response_word,
        reaction_time_ms,
        timestamp,
        session,
        emotion,
        emotion_confidence,
        skin_potential
      `)
      .eq('participant_id', participantId)
      .order('timestamp')

    // Calculate session statistics
    const sessionStats = sessions.map(session => {
      const sessionResponses = responses?.filter(r => r.session === session.session_type) || []
      const totalResponseTime = sessionResponses.reduce((sum, r) => sum + (r.reaction_time_ms || 0), 0)

      return {
        session_id: session.id,
        session_type: session.session_type,
        start_time: session.start_time,
        end_time: session.end_time,
        response_count: sessionResponses.length,
        avg_response_time_ms: sessionResponses.length > 0 ? Math.round(totalResponseTime / sessionResponses.length) : 0,
        responses: sessionResponses.map(r => ({
          id: r.id,
          stimulus_word: r.stimulus_word,
          response_word: r.response_word,
          reaction_time_ms: r.reaction_time_ms,
          timestamp: r.timestamp,
          emotion: r.emotion,
          emotion_confidence: r.emotion_confidence,
          skin_potential: r.skin_potential,
          relative_time_ms: r.timestamp ? new Date(r.timestamp).getTime() - new Date(session.start_time || 0).getTime() : 0
        }))
      }
    })

    // Calculate overall statistics
    const totalResponses = responses?.length || 0
    const totalResponseTime = responses?.reduce((sum, r) => sum + (r.reaction_time_ms || 0), 0) || 0
    const avgResponseTime = totalResponses > 0 ? Math.round(totalResponseTime / totalResponses) : 0

    // Group responses by time windows for distribution analysis
    const timeDistribution: Record<string, number> = {}
    responses?.forEach(response => {
      if (response.timestamp && sessions[0]?.start_time) {
        const relativeTime = new Date(response.timestamp).getTime() - new Date(sessions[0].start_time).getTime()
        const minutes = Math.floor(relativeTime / (1000 * 60))
        const timeWindow = `${minutes}-${minutes + 1}min`
        timeDistribution[timeWindow] = (timeDistribution[timeWindow] || 0) + 1
      }
    })

    // Word frequency analysis
    const wordFrequency: Record<string, number> = {}
    responses?.forEach(response => {
      if (response.stimulus_word) {
        wordFrequency[response.stimulus_word] = (wordFrequency[response.stimulus_word] || 0) + 1
      }
    })

    const timelineData = {
      session_info: {
        participant_id: participantId,
        participant_name: participant.name,
        total_sessions: sessions.length,
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
          participant_initialized: sessions.length
        },
        word_frequency: wordFrequency,
        time_distribution: timeDistribution
      },
      response_patterns: sessionStats.flatMap(s => s.responses),
      summary: {
        participant_id: participantId,
        total_sessions: sessions.length,
        total_responses: totalResponses,
        avg_response_time_ms: avgResponseTime,
        data_completeness: {
          has_consent: true,
          has_session_data: true,
          has_video_files: false, // Would need to check file storage
          has_physiological_data: responses?.some(r => r.skin_potential !== null) || false,
          data_quality_score: Math.round((totalResponses / Math.max(sessions.length * 100, 1)) * 100)
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
