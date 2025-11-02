import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-client'
import { JUNG_STIMULUS_WORDS } from '@/constants/jung'

// Merkle DAG: api.admin.jung.seed
// ユング刺激語をSupabaseのword_stimuliテーブルに投入

export async function POST(_req: NextRequest) {
  try {
    const client = getSupabaseClient()
    const now = new Date().toISOString()

    // word_stimuliテーブルにupsert
    const wordsToInsert = JUNG_STIMULUS_WORDS.map(w => ({
      id: w.id,
      word: w.japanese,
    }));

    const { data, error } = await client
      .from('word_stimuli')
      .upsert(wordsToInsert, {
        onConflict: 'id',
      })
      .select();

    if (error) {
      throw error;
    }

    const upserted = data?.length || 0;

    return NextResponse.json({ success: true, upserted })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}


