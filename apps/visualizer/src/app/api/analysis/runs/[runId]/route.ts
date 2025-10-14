import { NextRequest, NextResponse } from 'next/server'
import { createNeo4jClient } from '@/lib/neo4j'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params
    const client = createNeo4jClient()
    const rows = await client.query(
      'MATCH (r:AnalysisRun {id: $runId}) RETURN r',
      { runId }
    )
    if (!rows || rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(rows[0].r)
  } catch (error) {
    console.error('Failed to get run:', error)
    return NextResponse.json({ error: 'Failed to get run' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params
    const body = await req.json().catch(() => ({}))
    const action = body?.action
    const client = createNeo4jClient()
    const now = new Date().toISOString()

    if (action === 'cancel') {
      const rows = await client.query(
        'MATCH (r:AnalysisRun {id: $runId}) SET r.status = "cancelled", r.updated_at = $now RETURN r',
        { runId, now }
      )
      return NextResponse.json(rows?.[0]?.r || { ok: true })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (error) {
    console.error('Failed to patch run:', error)
    return NextResponse.json({ error: 'Failed to patch run' }, { status: 500 })
  }
}


