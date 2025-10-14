import { NextRequest, NextResponse } from 'next/server'
import { createArangoDBClient } from '@/lib/arangodb'

export async function GET() {
  try {
    const client = createArangoDBClient()
    const query = `
      FOR r IN analysis_runs
        SORT r.created_at DESC
        LIMIT 100
        RETURN r
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
    const client = createArangoDBClient()
    const now = new Date().toISOString()
    
    // グローバル実行（participant未指定）用のプレースホルダ
    const insertQuery = `INSERT @doc INTO analysis_runs RETURN NEW`
    const [run] = await client.query(insertQuery, {
      doc: {
        participant_id: 'all',
        status: 'running',
        progress: 0,
        model_version: 'dev',
        notes: 'manual-run from /analysis',
        created_at: now,
        updated_at: now,
      },
    })

    // Start analysis workflow via new API
    try {
      const workflowId = `analysis-workflow-${run._key}`

      const workflowResponse = await fetch('http://localhost:8000/api/workflows/start-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionIds: [], // Will be updated with actual session IDs
          modelVersion: 'dev',
          notes: `run=${run._key}`,
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

    return NextResponse.json({ ok: true, runId: run._key }, { status: 202 })
  } catch (error) {
    console.error('Failed to start run:', error)
    return NextResponse.json({ error: 'Failed to start run' }, { status: 500 })
  }
}