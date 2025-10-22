import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { spawn } from 'child_process'
import path from 'path'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: participantId } = await params

    // Spawn analyzer pipeline as a background process.
    // It processes unprocessed responses globally; notes include the participantId for traceability.
    const projectRoot = path.resolve(process.cwd(), '../../..')

    const child = spawn(
      'python3',
      ['-m', 'apps.analyzer.src.main', '--model-version', 'dev', '--notes', `triggered-from-ui participant=${participantId}`],
      {
        cwd: projectRoot,
        stdio: 'ignore',
        detached: true,
      }
    )

    child.unref()

    return NextResponse.json(
      {
        status: 'accepted',
        message: 'Analyzer started',
        participantId,
      },
      { status: 202 }
    )
  } catch (error) {
    console.error('Failed to start analyzer:', error)
    return NextResponse.json(
      { error: 'Failed to start analyzer' },
      { status: 500 }
    )
  }
}


