import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

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

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get analysis results for the participant using the new table structure
    const { data: results, error } = await supabase
      .from('participant_analysis_results')
      .select('*')
      .eq('participant_id', participantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching analysis results:', error)
      return NextResponse.json(
        { error: 'Failed to fetch analysis results' },
        { status: 500 }
      )
    }

    // Transform the data for the frontend
    const transformedResults = (results || []).map(result => ({
      id: result.id,
      stimulusWord: result.stimulus_word,
      responseWord: result.response_word,
      spiritProbability: result.spirit_probability,
      reactionTime: result.reaction_time_ms || 0,
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