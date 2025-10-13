import { NextRequest, NextResponse } from 'next/server'
import { TemporalClientManager, isTemporalAvailable } from '@/lib/temporal-client'

export async function POST(req: NextRequest) {
  try {
    const { runId } = await req.json()
    if (!runId) return NextResponse.json({ error: 'runId required' }, { status: 400 })

    // Merkle DAG: visualization_start -> temporal_workflow_start
    if (!isTemporalAvailable()) {
      return NextResponse.json({ error: 'Temporal not available' }, { status: 503 })
    }

    try {
      const workflowId = `visualization-workflow-${runId}`
      
      await TemporalClientManager.startWorkflow('VisualizationWorkflow', {
        workflowId,
        taskQueue: 'analyzer-task-queue',
        args: [runId, {}], // run_id, config
      })

      return NextResponse.json({ ok: true, message: 'Visualization workflow started', runId }, { status: 202 })
    } catch (temporalError) {
      console.error('Failed to start visualization workflow:', temporalError)
      return NextResponse.json({ error: 'Failed to start visualization workflow' }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to process visualization request:', error)
    return NextResponse.json({ error: 'Failed to process visualization request' }, { status: 500 })
  }
}