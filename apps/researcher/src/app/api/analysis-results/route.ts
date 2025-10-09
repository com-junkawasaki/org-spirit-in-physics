import { NextRequest, NextResponse } from 'next/server'
import { getAnalysisResultsForParticipant } from '@/lib/data'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const participantId = searchParams.get('participantId')

    if (!participantId) {
      return NextResponse.json(
        { error: 'participantId is required' },
        { status: 400 }
      )
    }

    const results = await getAnalysisResultsForParticipant(participantId)

    // Transform the data for the frontend
    const transformedResults = results.map(result => ({
      id: result.id,
      stimulusWord: result.stimulus_word,
      responseWord: result.response_word,
      spiritProbability: result.kawasaki_p_value,
      reactionTime: result.reaction_time_ms,
      emotionData: result.emotion_data || {},
      timestamp: result.created_at,
      components: {
        word2vec: result.word2vec_component || 0,
        reaction_time: result.reaction_time_component || 0,
        skin_potential: result.skin_potential_component || 0,
        emotion: result.emotion_component || 0
      }
    }))

    return NextResponse.json(transformedResults)
  } catch (error) {
    console.error('Failed to fetch analysis results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analysis results' },
      { status: 500 }
    )
  }
}