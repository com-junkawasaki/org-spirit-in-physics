import { NextRequest, NextResponse } from 'next/server'
import { createNeo4jClient } from '@/lib/neo4j'

// Merkle DAG: api.participants.stats
// 参加者ごとの ExperimentSession / Response 件数を返す

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const participantId = params.id
    const client = createNeo4jClient()

    const [sessionCountRes, responseCountRes, sessionsRes] = await Promise.all([
      client.query(
        `MATCH (s:ExperimentSession) WHERE s.participant_id = $participantId RETURN count(s) AS cnt`,
        { participantId }
      ),
      client.query(
        `MATCH (r:Response) WHERE r.participant_id = $participantId RETURN count(r) AS cnt`,
        { participantId }
      ),
      client.query(
        `MATCH (s:ExperimentSession) WHERE s.participant_id = $participantId RETURN s.id AS id ORDER BY s.id`,
        { participantId }
      ),
    ])

    const sessionCount = Number(sessionCountRes?.[0]?.cnt || 0)
    const responseCount = Number(responseCountRes?.[0]?.cnt || 0)
    const sessionIds = (sessionsRes || []).map((r: any) => r.id)

    // セッションごとのレスポンス数（上限5セッションまで）
    const perSession: Array<{ sessionId: string; responses: number }> = []
    for (const sid of sessionIds.slice(0, 5)) {
      const cnt = await client.query(
        `MATCH (r:Response) WHERE r.participant_id = $participantId AND r.session_id = $sessionId RETURN count(r) AS cnt`,
        { participantId, sessionId: sid }
      )
      perSession.push({ sessionId: sid, responses: Number(cnt?.[0]?.cnt || 0) })
    }

    return NextResponse.json({
      participantId,
      sessionCount,
      responseCount,
      sessionIds,
      perSession,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


