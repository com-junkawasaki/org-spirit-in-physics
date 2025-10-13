import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { spawn } from 'child_process'

export async function POST(req: NextRequest) {
  try {
    const { runId } = await req.json()
    if (!runId) return NextResponse.json({ error: 'runId required' }, { status: 400 })

    const projectRoot = path.resolve(process.cwd(), '../../..')
    const child = spawn(
      'python3',
      ['-m', 'apps.analyzer.src.start_visualization_workflow', '--run-id', String(runId)],
      { cwd: projectRoot, stdio: 'ignore', detached: true }
    )
    child.unref()
    return NextResponse.json({ ok: true, message: 'Visualization workflow started', runId }, { status: 202 })
  } catch (error) {
    console.error('Failed to start visualization workflow:', error)
    return NextResponse.json({ error: 'Failed to start visualization workflow' }, { status: 500 })
  }
}


