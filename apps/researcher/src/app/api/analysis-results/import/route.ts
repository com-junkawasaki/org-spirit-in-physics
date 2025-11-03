import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-client'

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

    const client = getSupabaseClient()

    // Validate participant exists in Supabase
    if (participantId) {
      const { data, error } = await client
        .from('participants')
        .select('id')
        .eq('id', participantId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Participant not found in Supabase' },
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

    // participant_analysis_resultsテーブルに保存
    const analysisResultsToInsert = validatedResults.map(result => ({
      participant_id: result.participant_id,
      experiment_id: result.experiment_id,
      word_stimulus_id: result.word_stimulus_id,
      stimulus_word: result.stimulus_word,
      response_word: result.response_word,
      reaction_time_ms: result.reaction_time_ms,
      spirit_probability: result.spirit_probability,
      word2vec_component: result.word2vec_component,
      reaction_time_component: result.reaction_time_component,
      skin_potential_component: result.skin_potential_component,
      emotion_component: result.emotion_component,
      emotion_data: result.emotion_data || {},
      physiological_data: result.physiological_data || {},
    }));

    const { data: insertedResults, error: insertError } = await client
      .from('participant_analysis_results')
      .insert(analysisResultsToInsert)
      .select();

    if (insertError) {
      throw insertError;
    }

    console.log(`Imported ${insertedResults?.length || 0} analysis results to Supabase`)

    return NextResponse.json({
      message: `Analysis results imported successfully`,
      count: insertedResults?.length || 0,
      results: insertedResults || []
    })

  } catch (error) {
    console.error('Failed to import analysis results:', error)
    return NextResponse.json(
      { error: 'Failed to import analysis results', details: (error as Error).message },
      { status: 500 }
    )
  }
}
