import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

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

    const supabase = createServerSupabaseClient()

    // If participantId is provided, validate it exists
    if (participantId) {
      const { data: participant } = await supabase
        .from('participants')
        .select('id')
        .eq('id', participantId)
        .single()

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
      // Find the corresponding experiment_id and word_stimulus_id
      let experimentId = result.experiment_id
      let wordStimulusId = result.word_stimulus_id

      // If not provided, try to find them based on participant and timestamp
      if (!experimentId || !wordStimulusId) {
        const participantIdToUse = result.participant_id || participantId
        if (!participantIdToUse) {
          return NextResponse.json(
            { error: 'participant_id is required for each result or as a query parameter' },
            { status: 400 }
          )
        }

        // Find the experiment session for this participant
        const { data: session } = await supabase
          .from('participant_experiment_sessions')
          .select('id')
          .eq('participant_id', participantIdToUse)
          .order('start_time', { ascending: false })
          .limit(1)
          .single()

        if (!session) {
          return NextResponse.json(
            { error: `No experiment session found for participant ${participantIdToUse}` },
            { status: 404 }
          )
        }

        experimentId = session.id

        // Find the word stimulus
        const { data: wordStimulus } = await supabase
          .from('word_stimuli')
          .select('id')
          .eq('word', result.stimulus_word)
          .single()

        if (!wordStimulus) {
          return NextResponse.json(
            { error: `Word stimulus not found: ${result.stimulus_word}` },
            { status: 404 }
          )
        }

        wordStimulusId = wordStimulus.id
      }

      validatedResults.push({
        participant_id: result.participant_id || participantId,
        experiment_id: experimentId,
        word_stimulus_id: wordStimulusId,
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

    // Insert the results into the database
    const { data, error } = await supabase
      .from('participant_analysis_results')
      .insert(validatedResults)
      .select()

    if (error) {
      console.error('Error inserting analysis results:', error)
      return NextResponse.json(
        { error: 'Failed to insert analysis results', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Successfully imported ${data.length} analysis results`,
      count: data.length,
      results: data
    })

  } catch (error) {
    console.error('Failed to import analysis results:', error)
    return NextResponse.json(
      { error: 'Failed to import analysis results', details: error.message },
      { status: 500 }
    )
  }
}
