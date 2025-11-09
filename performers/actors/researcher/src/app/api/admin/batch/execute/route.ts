// Merkle DAG: admin_batch_execute_api -> batch_execution_service
// API route to execute timeline batch processing via Docker Compose

import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { participantId, incremental } = body

    if (!participantId) {
      return NextResponse.json(
        { error: 'participantId is required' },
        { status: 400 }
      )
    }

    // Validate participantId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(participantId)) {
      return NextResponse.json(
        { error: 'Invalid participantId format' },
        { status: 400 }
      )
    }

    // Execute Docker command directly (using docker CLI)
    // Note: This requires Docker socket to be mounted
    const incrementalFlag = incremental ? '--incremental' : ''
    const command = `docker run --rm --network spirit-in-physics_spirit-network --env DATABASE_URL=postgresql://postgres:postgres@postgres:5432/postgres spirit-in-physics-timeline-batch /app/timeline-batch ${participantId} ${incrementalFlag}`.trim()

    console.log(`[Batch API] Executing batch processing for participant: ${participantId}`)
    console.log(`[Batch API] Incremental: ${incremental}`)
    console.log(`[Batch API] Command: ${command}`)

    // Execute in background (don't wait for completion)
    execAsync(command).catch((error) => {
      console.error(`[Batch API] Batch execution error:`, error)
    })

    // Return immediately with job ID
    return NextResponse.json({
      success: true,
      participantId,
      incremental: incremental || false,
      message: 'Batch processing job started',
      jobId: `batch-${participantId}-${Date.now()}`,
    })
  } catch (error) {
    console.error('[Batch API] Error executing batch:', error)
    return NextResponse.json(
      { 
        error: 'Failed to execute batch processing', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

