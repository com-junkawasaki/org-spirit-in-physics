import { NextRequest, NextResponse } from 'next/server'
import { getAnalysisResults } from '@/lib/data'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const participantId = searchParams.get('participantId')

    const results = await getAnalysisResults(participantId || undefined)

    // Process results for frontend visualization
    const processedResults = results.map(result => ({
      id: result.id,
      participantId: result.analysis_run_id,
      stimulusWord: result.stimulus_word,
      responseWord: result.response_word,
      spiritProbability: result.kawasaki_p_value,
      components: {
        word2vec: result.word2vec_component,
        reactionTime: result.reaction_time_component,
        skinPotential: result.skin_potential_component,
        emotion: result.emotion_component
      },
      emotionData: result.emotion_data,
      physiologicalData: result.physiological_data,
      timestamp: result.created_at
    }))

    return NextResponse.json(processedResults)
  } catch (error) {
    console.error('Failed to fetch analysis results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analysis results' },
      { status: 500 }
    )
  }
}
