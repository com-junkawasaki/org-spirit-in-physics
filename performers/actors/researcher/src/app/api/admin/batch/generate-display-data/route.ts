/**
 * Merkle DAG: api.admin.batch.generate_display_data
 * API endpoint to trigger display data generation for a participant
 * RDF: https://spirit-in-physics.gftd.ai/api/admin/batch/generate-display-data
 * 
 * Note: This triggers the same batch processing as /api/admin/batch/execute,
 * which now includes display data generation (word-second aggregates, word aggregates,
 * sampled timeline, and force graph data).
 */

import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { participantId } = body

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
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
    // Display data generation is included in the batch processing
    const networkName = process.env.DOCKER_NETWORK || 'spirit-in-physics_spirit-network'
    const command = `docker run --rm --network ${networkName} --env DATABASE_URL=postgresql://postgres:postgres@postgres:5432/postgres spirit-in-physics-timeline-batch /app/timeline-batch ${participantId}`.trim()

    console.log(`[Generate Display Data API] Executing batch processing (includes display data generation) for participant: ${participantId}`)
    console.log(`[Generate Display Data API] Command: ${command}`)

    // Execute in background (don't wait for completion)
    execAsync(command).catch((error) => {
      console.error(`[Generate Display Data API] Batch execution error:`, error)
    })

    // Return immediately with job ID
    return NextResponse.json({
      success: true,
      participantId,
      message: 'Display data generation started (includes word-second aggregates, word aggregates, sampled timeline, and force graph data)',
      jobId: `display-data-${participantId}-${Date.now()}`,
    })
  } catch (error: any) {
    console.error('[Generate Display Data API] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to start display data generation', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

