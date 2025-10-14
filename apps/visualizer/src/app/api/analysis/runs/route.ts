import { NextRequest, NextResponse } from 'next/server'
import { createNeo4jClient } from '@/lib/arangodb'

export async function GET() {
  try {
    const client = createNeo4jClient()
    const query = `
      MATCH (r:AnalysisRun)
      RETURN r.id as _key,
             r.participant_id as participant_id,
             r.status as status,
             r.progress as progress,
             r.model_version as model_version,
             r.notes as notes,
             r.created_at as created_at,
             r.updated_at as updated_at
      ORDER BY r.created_at DESC
      LIMIT 100
    `
    const rows = await client.query(query)
    return NextResponse.json(rows || [])
  } catch (error) {
    console.error('Failed to list runs:', error)
    return NextResponse.json({ error: 'Failed to list runs' }, { status: 500 })
  }
}

export async function POST(_req: NextRequest) {
  try {
    const client = createNeo4jClient()
    const now = new Date().toISOString()
    const runId = `run_${Date.now()}`

    // グローバル実行（participant未指定）用のプレースホルダ
    const insertQuery = `
      CREATE (r:AnalysisRun {
        id: $id,
        participant_id: $participant_id,
        status: $status,
        progress: $progress,
        model_version: $model_version,
        notes: $notes,
        created_at: $created_at,
        updated_at: $updated_at
      })
      RETURN r
    `
    const result = await client.query(insertQuery, {
      id: runId,
      participant_id: 'all',
      status: 'running',
      progress: 0,
      model_version: 'dev',
      notes: 'manual-run from /analysis',
      created_at: now,
      updated_at: now,
    })

    const run = result[0]?.r

    // Start analysis workflow via new API
    try {
      const workflowId = `analysis-workflow-${runId}`

      const workflowResponse = await fetch('http://localhost:8000/api/workflows/start-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionIds: [], // Will be updated with actual session IDs
          modelVersion: 'dev',
          notes: `run=${runId}`,
          experimentType: 'unified'
        })
      })

      if (!workflowResponse.ok) {
        console.warn('Failed to start workflow, but continuing:', await workflowResponse.text())
      }
    } catch (workflowError) {
      console.warn('Workflow start failed, continuing without workflow:', workflowError)
      // Continue execution even if workflow fails
    }

    return NextResponse.json({ ok: true, runId: runId }, { status: 202 })
  } catch (error) {
    console.error('Failed to start run:', error)
    return NextResponse.json({ error: 'Failed to start run' }, { status: 500 })
  }
}