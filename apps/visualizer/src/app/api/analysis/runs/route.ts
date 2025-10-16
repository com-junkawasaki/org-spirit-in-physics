import { NextRequest, NextResponse } from 'next/server'
import { createNeo4jClient } from '@/lib/neo4j'

export async function GET() {
  try {
    const client = createNeo4jClient()
    
    // ガイドライン: 過取得の抑制：投影は最小限、リレーションは必要本数のみ
    const rows = await client.projectMinimalFields(
      'AnalysisRun',
      ['id', 'participant_id', 'status', 'progress', 'model_version', 'notes', 'created_at', 'updated_at'],
      {},
      { limit: 100 }
    )
    
    // ガイドライン: 必ずパラメタ化、文字列連結は厳禁
    const processedRows = (rows || []).map((row: any) => ({
      _key: row.id,
      participant_id: row.participant_id,
      status: row.status,
      progress: row.progress,
      model_version: row.model_version,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at
    }))
    
    return NextResponse.json(processedRows)
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

    // ガイドライン: MERGE操作の段階化
    const result = await client.mergeNode(
      'AnalysisRun',
      {
        id: runId,
        participant_id: 'all',
        status: 'running',
        progress: 0,
        model_version: 'dev',
        notes: 'manual-run from /analysis',
        created_at: now,
        updated_at: now
      }
    )

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