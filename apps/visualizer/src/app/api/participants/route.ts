import { NextRequest, NextResponse } from 'next/server'
import { createNeo4jClient } from '@/lib/neo4j'

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching participants from Neo4j...')
    const client = createNeo4jClient()

    // ガイドライン: 過取得の抑制：投影は最小限、リレーションは必要本数のみ
    const participants = await client.projectMinimalFields(
      'Participant',
      ['id', 'age', 'gender', 'handedness', 'consent_given', 'consent_timestamp', 'created_at'],
      {},
      { limit: 100 }
    )

    console.log('API: Raw participants data:', participants?.length || 0, 'participants')
    console.log('API: Participants sample:', participants?.slice(0, 2))

    // Process participants data for frontend
    const processedParticipants = (participants || []).map((participant: any) => ({
      id: participant.id,
      name: `参加者 ${participant.id.slice(0, 8)}`, // Default name format
      sessionCount: 0, // Will be fetched separately if needed
      responseCount: 0, // Will be fetched separately if needed
      averageSpiritProbability: 0, // Will be fetched separately if needed
      lastActivity: participant.created_at ? new Date(participant.created_at).getTime() : null,
      sessions: [] // Simplified for now
    }))

    console.log('API: Processed participants:', processedParticipants.length)
    return NextResponse.json(processedParticipants)
  } catch (error) {
    console.error('API: Failed to fetch participants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch participants', details: (error as Error).message },
      { status: 500 }
    )
  }
}
