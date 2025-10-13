import { NextRequest, NextResponse } from 'next/server'
import { createArangoDBClient } from '@/lib/arangodb'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params
    const client = createArangoDBClient()
    const rows = await client.query(
      'FOR r IN analysis_runs FILTER r._key == @k RETURN r',
      { k: runId }
    )
    if (!rows || rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(rows[0])
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
    const client = createArangoDBClient()
    const now = new Date().toISOString()

    if (action === 'cancel') {
      const rows = await client.query(
        'UPDATE @k WITH { status: "cancelled", updated_at: @now } IN analysis_runs RETURN NEW',
        { k: runId, now }
      )
      return NextResponse.json(rows?.[0] || { ok: true })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (error) {
    console.error('Failed to patch run:', error)
    return NextResponse.json({ error: 'Failed to patch run' }, { status: 500 })
  }
}


