import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: participantId } = await params

    // For now, we'll create mock data based on our analysis
    // In a real implementation, this would integrate with the IntegratedDataPipeline
    const mockTimelineData = {
      session_info: {
        participant_id: participantId,
        total_events: 1004,
        duration_ms: 1414400,
        word_count: 199,
        avg_response_time_ms: 2500
      },
      timeline_events: [],
      event_analysis: {
        event_types: {
          word_displayed: 199,
          speech_detected: 150,
          response_window_opened: 199,
          participant_initialized: 1
        },
        word_frequency: {
          'インク': 2, 'ノート': 2, '家': 2, '嬉しい': 2, '花嫁': 2,
          '塗る': 2, '幸運': 2, '古い': 2, '部分': 2, '病気': 2,
          'プライド': 2, '癖': 2, '針': 2, '窓': 2, '歌う': 2,
          '旅行': 2, '注意': 2, '子供': 2, '船': 2, 'お金': 2
        },
        time_distribution: {
          '0-1min': 0,
          '1-5min': 15,
          '5-10min': 50,
          '10-20min': 99,
          '20min+': 35
        }
      },
      response_patterns: [],
      summary: {
        participant_id: participantId,
        total_events: 1004,
        session_duration_ms: 1414400,
        word_count: 199,
        avg_response_time_ms: 2500,
        data_completeness: {
          has_consent: true,
          has_session_data: true,
          has_video_files: true,
          has_physiological_data: true,
          data_quality_score: 85
        }
      }
    }

    return NextResponse.json(mockTimelineData)
  } catch (error) {
    console.error('Error fetching participant timeline:', error)
    return NextResponse.json(
      { error: 'Failed to fetch participant timeline' },
      { status: 500 }
    )
  }
}
