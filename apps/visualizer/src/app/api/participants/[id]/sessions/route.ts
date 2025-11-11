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
    
    // Helper function to convert Neo4j Integer objects to JavaScript numbers
    const toNumber = (value: any): number | null => {
      if (value === null || value === undefined) return null
      if (typeof value === 'object' && value !== null && 'low' in value) {
        // Neo4j Integer型の場合
        return value.low
      }
      const num = Number(value)
      return isNaN(num) ? null : num
    }
    
    // Helper function to convert Neo4j date/timestamp to string or number
    const toTimestamp = (value: any): number | null => {
      if (value === null || value === undefined) return null
      if (typeof value === 'object' && value !== null && 'low' in value) {
        // Neo4j Integer型の場合
        return value.low
      }
      if (typeof value === 'string') {
        const date = new Date(value)
        return isNaN(date.getTime()) ? null : date.getTime()
      }
      const num = Number(value)
      return isNaN(num) ? null : num
    }
    
    const sessions = sessionsResult?.map((record: any) => ({
      id: record.id || '',
      sessionIndex: toNumber(record.sessionIndex),
      createdAt: record.createdAt ? (typeof record.createdAt === 'string' ? record.createdAt : new Date(toTimestamp(record.createdAt) || Date.now()).toISOString()) : null,
      startTs: toTimestamp(record.startTs),
      endTs: toTimestamp(record.endTs),
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

