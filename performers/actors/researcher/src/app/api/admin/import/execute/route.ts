// Merkle DAG: admin_import_execute_api -> import_execution_service
// API route to execute data import via Docker Compose

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

    // The dataset path is relative to the importer container's mounted volume
    const datasetPath = `/app/dataset/participants/${participantId}`

    // Execute Docker command directly (using docker CLI)
    // Note: This requires Docker socket to be mounted
    // Network name is typically {project-name}_{network-name}
    const networkName = process.env.DOCKER_NETWORK || 'spirit-in-physics_spirit-network'
    const command = `docker run --rm --network ${networkName} --env DATABASE_URL=postgresql://postgres:postgres@postgres:5432/postgres --volume /workspace/performers/actors/researcher/public/dataset:/app/dataset:ro spirit-in-physics-importer /app/importer ${datasetPath}`

    console.log(`[Import API] Executing import for participant: ${participantId}`)
    console.log(`[Import API] Command: ${command}`)

    // Execute in background (don't wait for completion)
    execAsync(command).catch((error) => {
      console.error(`[Import API] Import execution error:`, error)
    })

    // Return immediately with job ID
    return NextResponse.json({
      success: true,
      participantId,
      message: 'Import job started',
      jobId: `import-${participantId}-${Date.now()}`,
    })
  } catch (error) {
    console.error('[Import API] Error executing import:', error)
    return NextResponse.json(
      { 
        error: 'Failed to execute import', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

