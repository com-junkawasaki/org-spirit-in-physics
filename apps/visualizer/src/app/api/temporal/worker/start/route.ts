import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { spawn } from 'child_process'

export async function POST(_req: NextRequest) {
  try {
    const projectRoot = path.resolve(process.cwd(), '../../..')
    const child = spawn(
      'python3',
      ['-m', 'apps.analyzer.src.run_worker'],
      { cwd: projectRoot, stdio: 'ignore', detached: true }
    )
    child.unref()
    return NextResponse.json({ ok: true, message: 'Temporal worker started' }, { status: 202 })
  } catch (error) {
    console.error('Failed to start Temporal worker:', error)
    return NextResponse.json({ error: 'Failed to start Temporal worker' }, { status: 500 })
  }
}