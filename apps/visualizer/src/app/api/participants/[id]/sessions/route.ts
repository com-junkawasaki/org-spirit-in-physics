// Merkle DAG: participants.sessions.endpoint
// 参加者のセッション一覧取得APIエンドポイント

import { NextRequest, NextResponse } from 'next/server'
import { createNeo4jClient } from '@/lib/neo4j'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const participantId = params.id
    const client = createNeo4jClient()

    // 新しい構造（Participant -> Session）でセッション一覧を取得
    const sessionsQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
      RETURN s.id as id, s.session_index as sessionIndex, s.created_at as createdAt, 
             s.start_ts as startTs, s.end_ts as endTs
      ORDER BY s.created_at DESC
    `

    const sessionsResult = await client.query(sessionsQuery, { participantId })
    
    const sessions = sessionsResult?.map((record: any) => ({
      id: record.id,
      sessionIndex: record.sessionIndex,
      createdAt: record.createdAt,
      startTs: record.startTs,
      endTs: record.endTs,
    })) || []

    return NextResponse.json({ sessions })
  } catch (error: any) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

