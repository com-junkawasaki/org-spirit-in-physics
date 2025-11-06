import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@spiritinphysics/supabase'

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

    // Merkle DAG: api.analysis_results.import.get_or_create_word_stimuli
    // stimulus_wordに基づいてword_stimuliテーブルからIDを取得、存在しない場合は作成
    const getOrCreateWordStimulusId = async (stimulusWord: string): Promise<number> => {
      // 既存のword_stimuliを検索
      const { data: existing, error: selectError } = await client
        .from('word_stimuli')
        .select('id')
        .eq('word', stimulusWord)
        .maybeSingle();

      // エラーが発生した場合
      if (selectError) {
        console.error('Error searching for word_stimulus:', selectError);
        throw new Error(`Failed to search for word_stimulus "${stimulusWord}": ${selectError.message}`);
      }

      // レコードが存在する場合はIDを返す
      if (existing) {
        return existing.id;
      }

      // 存在しない場合は新規作成
      // 最大IDを取得して+1する
      const { data: maxIdData, error: maxIdError } = await client
        .from('word_stimuli')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxIdError) {
        console.error('Error getting max word_stimulus ID:', maxIdError);
        // エラーが発生した場合、seed.sqlの最大IDが100なので101から開始
      }

      const newId = maxIdData ? (maxIdData.id as number) + 1 : 101; // seed.sqlの最大IDが100なので101から開始

      const { data: inserted, error: insertError } = await client
        .from('word_stimuli')
        .insert({ id: newId, word: stimulusWord })
        .select('id')
        .single();

      if (insertError || !inserted) {
        console.error('Failed to create word_stimulus:', insertError);
        throw new Error(`Failed to create word_stimulus for "${stimulusWord}": ${insertError?.message || 'Unknown error'}`);
      }

      return inserted.id;
    };

    // Transform and validate the results
    const validatedResults: AnalysisResultData[] = []

    for (const result of results) {
      const participantIdToUse = result.participant_id || participantId
      if (!participantIdToUse) {
        return NextResponse.json(
          { error: 'participant_id is required for each result or as a query parameter' },
          { status: 400 }
        )
      }

      // Generate UUID for experiment_id if not provided
      const experimentId = result.experiment_id || '00000000-0000-0000-0000-000000000000';
      
      // word_stimulus_idを取得または作成
      let wordStimulusId: number;
      if (result.word_stimulus_id) {
        wordStimulusId = result.word_stimulus_id;
      } else if (result.stimulus_word) {
        try {
          wordStimulusId = await getOrCreateWordStimulusId(result.stimulus_word);
        } catch (err) {
          console.error('Error getting/creating word_stimulus:', err);
          // エラーが発生した場合、デフォルト値を使用
          wordStimulusId = 1;
        }
      } else {
        wordStimulusId = 1;
      }
      
      validatedResults.push({
        participant_id: participantIdToUse,
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
      console.error('Failed to insert analysis results:', insertError);
      
      // 外部キー制約違反の詳細なエラーメッセージ
      if (insertError.code === '23503') {
        return NextResponse.json(
          { 
            error: 'Foreign key constraint violation',
            details: 'The word_stimulus_id does not exist in word_stimuli table. Please ensure the word_stimuli record exists.',
            code: insertError.code,
            hint: insertError.hint
          },
          { status: 400 }
        );
      }
      
      // その他のデータベースエラー
      return NextResponse.json(
        { 
          error: 'Database error',
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint
        },
        { status: 400 }
      );
    }

    console.log(`Imported ${insertedResults?.length || 0} analysis results to Supabase`)

    return NextResponse.json({
      success: true,
      message: `Analysis results imported successfully`,
      count: insertedResults?.length || 0,
      results: insertedResults || []
    })

  } catch (error) {
    console.error('Failed to import analysis results:', error)
    
    // エラーの種類に応じて詳細なメッセージを返す
    let errorMessage = 'Failed to import analysis results';
    let errorDetails = 'Unknown error';
    let statusCode = 500;

    if (error instanceof Error) {
      errorDetails = error.message;
      
      // ネットワークエラー
      if (error.message.includes('fetch') || error.message.includes('network')) {
        errorMessage = 'Network error occurred';
        statusCode = 503;
      }
      // バリデーションエラー
      else if (error.message.includes('required') || error.message.includes('invalid')) {
        errorMessage = 'Validation error';
        statusCode = 400;
      }
      // データベースエラー
      else if (error.message.includes('constraint') || error.message.includes('foreign key')) {
        errorMessage = 'Database constraint violation';
        statusCode = 400;
      }
    } else if (typeof error === 'object' && error !== null) {
      // Supabaseエラーオブジェクトの場合
      const supabaseError = error as any;
      errorDetails = supabaseError.message || JSON.stringify(error);
      if (supabaseError.code) {
        errorDetails += ` (code: ${supabaseError.code})`;
      }
    } else {
      errorDetails = String(error);
    }

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: errorDetails
      },
      { status: statusCode }
    )
  }
}
