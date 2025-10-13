import { NextRequest, NextResponse } from 'next/server'
import { getAnalysisResultsForParticipant } from '@/lib/data'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const participantId = searchParams.get('participantId')

    let results
    if (participantId) {
      // Get analysis results for the specific participant
      results = await getAnalysisResultsForParticipant(participantId)
    } else {
      // Get all analysis results
      const { getAnalysisResults } = await import('@/lib/data')
      results = await getAnalysisResults()
    }

    // Transform the data for the frontend (already in correct format from lib/data.ts)
    const transformedResults = results.map(result => ({
      id: result.id,
      stimulus_word: result.stimulus_word,
      response_word: result.response_word,
      p_value: result.p_value,
      emotion_data: result.emotion_data || {},
      created_at: result.created_at,
      word2vec_component: result.word2vec_component || 0,
      reaction_time_component: result.reaction_time_component || 0,
      skin_potential_component: result.skin_potential_component || 0,
      emotion_component: result.emotion_component || 0,
      physiological_data: result.physiological_data || null
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