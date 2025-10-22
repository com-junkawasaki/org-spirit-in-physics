import { NextRequest, NextResponse } from 'next/server'
import { createNeo4jClient } from '@/lib/neo4j'
import { JUNG_STIMULUS_WORDS } from '@/constants/jung'

// Merkle DAG: api.admin.jung.seed
// ユング刺激語をNeo4jのWordStimulusノードとして投入

export async function POST(_req: NextRequest) {
  try {
    const client = createNeo4jClient()
    const now = new Date().toISOString()

    // MERGE の分離：存在確認と作成を段階化（UNWINDで一括）
    const query = `
      UNWIND $words AS w
      MERGE (ws:WordStimulus { id: w.id })
      ON CREATE SET ws.word = w.japanese, ws.language = 'ja', ws.pronunciation = w.pronunciation, ws.created_at = datetime($now)
      ON MATCH SET ws.word = coalesce(ws.word, w.japanese), ws.language = coalesce(ws.language, 'ja'), ws.pronunciation = coalesce(ws.pronunciation, w.pronunciation), ws.updated_at = datetime($now)
      RETURN count(ws) as upserted
    `

    const params = {
      words: JUNG_STIMULUS_WORDS.map(w => ({ id: `jung_${w.id}`, japanese: w.japanese, pronunciation: w.pronunciation })),
      now,
    }

    const res = await client.query(query, params)
    const upserted = res?.[0]?.upserted || 0

    return NextResponse.json({ success: true, upserted })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}


