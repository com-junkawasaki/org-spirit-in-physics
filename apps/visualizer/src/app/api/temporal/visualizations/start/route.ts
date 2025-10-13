import { NextRequest, NextResponse } from 'next/server'
import { Connection, WorkflowClient } from '@temporalio/client'

export async function POST(req: NextRequest) {
  try {
    const { runId } = await req.json()
    if (!runId) return NextResponse.json({ error: 'runId required' }, { status: 400 })

    // Temporal clientを使用してワークフローを実行
    const connection = await Connection.connect({
      address: process.env.TEMPORAL_HOST || 'localhost:7233',
    })
    
    const workflowClient = new WorkflowClient({ connection })

    const workflowId = `visualization-workflow-${runId}`
    
    await workflowClient.start('VisualizationWorkflow', {
      workflowId,
      taskQueue: 'analyzer-task-queue',
      args: [runId, {}], // run_id, config
    })

    return NextResponse.json({ ok: true, message: 'Visualization workflow started', runId }, { status: 202 })
  } catch (error) {
    console.error('Failed to start visualization workflow:', error)
    return NextResponse.json({ error: 'Failed to start visualization workflow' }, { status: 500 })
  }
}