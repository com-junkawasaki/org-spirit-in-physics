import { NextRequest, NextResponse } from 'next/server'
import { getAllParticipants } from '@/lib/data'

interface AnalysisResultData {
  participant_id: string
  experiment_id: string
  word_stimulus_id: number
  stimulus_word: string
  response_word: string
  reaction_time_ms?: number
  spirit_probability: number
  word2vec_component?: number
  reaction_time_component?: number
  skin_potential_component?: number
  emotion_component?: number
  emotion_data?: Record<string, any>
  physiological_data?: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { results, participantId } = body

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: 'Results array is required' },
        { status: 400 }
      )
    }

    // Validate participant exists via Connect RPC
    if (participantId) {
      const participants = await getAllParticipants()
      const participant = participants.find(p => p.id === participantId)
      if (!participant) {
        return NextResponse.json(
          { error: 'Participant not found' },
          { status: 404 }
        )
      }
    }

    // Transform and validate the results
    const validatedResults: AnalysisResultData[] = []

    for (const result of results) {
      // For now, we don't have experiment sessions or word stimuli in TerminusDB
      // So we'll use simplified validation
      const participantIdToUse = result.participant_id || participantId
      if (!participantIdToUse) {
        return NextResponse.json(
          { error: 'participant_id is required for each result or as a query parameter' },
          { status: 400 }
        )
      }

      validatedResults.push({
        participant_id: participantIdToUse,
        experiment_id: result.experiment_id || 'default-session',
        word_stimulus_id: result.word_stimulus_id || 1,
        stimulus_word: result.stimulus_word,
        response_word: result.response_word,
        reaction_time_ms: result.reaction_time_ms,
        spirit_probability: result.spirit_probability,
        word2vec_component: result.word2vec_component,
        reaction_time_component: result.reaction_time_component,
        skin_potential_component: result.skin_potential_component,
        emotion_component: result.emotion_component,
        emotion_data: result.emotion_data || {},
        physiological_data: result.physiological_data || {}
      })
    }

    // Note: Connect RPC service doesn't have analysis results storage yet
    // This is a placeholder for future implementation
    console.log(`Would import ${validatedResults.length} analysis results via Connect RPC`)

    return NextResponse.json({
      message: `Analysis results import prepared for ${validatedResults.length} results (Connect RPC storage not yet implemented)`,
      count: validatedResults.length,
      results: validatedResults.map(r => ({ ...r, id: `mock-${Date.now()}` })),
      note: 'Connect RPC analysis results storage will be implemented in future updates'
    })

  } catch (error) {
    console.error('Failed to import analysis results:', error)
    return NextResponse.json(
      { error: 'Failed to import analysis results', details: (error as Error).message },
      { status: 500 }
    )
  }
}
